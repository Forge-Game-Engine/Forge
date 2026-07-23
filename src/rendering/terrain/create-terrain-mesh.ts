import { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import { Geometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { createTextureFromImage } from '../shaders/index.js';
import type { TerrainCurvePoint } from './terrain-curve.js';

/**
 * Texture and tiling options for one of a terrain mesh's two texture
 * layers (see {@link CreateTerrainMeshOptions}).
 */
export interface TerrainMeshLayerOptions {
  /**
   * The (already-loaded) image to tile across this layer - the same
   * convention `createImageSprite` uses, rather than loading a URL itself.
   */
  image: HTMLImageElement;

  /**
   * The world-space size of one tile of the texture: x tiles along the
   * curve's arc length, y tiles into the ground. Smaller values repeat the
   * texture more often over the same span of terrain.
   */
  tileSize: Vector2;

  /** Tint multiplied against the sampled texture. */
  tint: Color;
}

/**
 * Fields of {@link CreateTerrainMeshOptions} with a sensible default;
 * callers may omit these.
 */
export interface CreateTerrainMeshDefaultedOptions {
  /**
   * How wide (in world units) the blend between the border and fill layers
   * is, centered on `borderWidth`.
   */
  borderBlend: number;
}

export interface CreateTerrainMeshOptions extends Partial<CreateTerrainMeshDefaultedOptions> {
  /**
   * The dense curve points to build the mesh from - see `buildTerrainCurve`.
   * Pass the same points used to build the corresponding `TerrainShape` (by
   * mapping each `TerrainCurvePoint.position` into the `Vector2[]`
   * `TerrainShape` expects), so what's drawn always matches what's touched.
   */
  curvePoints: readonly TerrainCurvePoint[];

  /**
   * How far (in world units) the mesh extends below its lowest curve
   * point. Must match the `depth` passed to the corresponding
   * `TerrainShape` for the mesh to align with the collision volume.
   */
  depth: number;

  /**
   * The world-space position of the mesh. Must match the corresponding
   * `RigidBody`'s `position`.
   */
  position: Vector2;

  /**
   * The world-space rotation of the mesh, in radians. Must match the
   * corresponding `RigidBody`'s `angle`.
   */
  angle: number;

  /** The texture tiled across the terrain's surface, from the surface down to `borderWidth`. */
  border: TerrainMeshLayerOptions;

  /** The texture tiled across the terrain's interior, below `borderWidth`. */
  fill: TerrainMeshLayerOptions;

  /**
   * How deep (in world units) the border layer extends below the surface
   * before blending into the fill layer.
   */
  borderWidth: number;
}

const defaultCreateTerrainMeshOptions: CreateTerrainMeshDefaultedOptions = {
  borderBlend: 12,
};

/**
 * The static terrain mesh built by {@link createTerrainMesh}, ready to draw
 * with `createTerrainRenderEcsSystem`.
 */
export interface TerrainMesh {
  readonly geometry: Geometry;
  readonly material: Material;
  readonly vertexCount: number;
}

interface TerrainMeshData {
  positions: Float32Array;
  distances: Float32Array;
  depths: Float32Array;
  vertexCount: number;
}

function buildTerrainMeshData(
  curvePoints: readonly TerrainCurvePoint[],
  bottomY: number,
  angle: number,
  position: Vector2,
): TerrainMeshData {
  const positions: number[] = [];
  const distances: number[] = [];
  const depths: number[] = [];

  const pushVertex = (
    localPoint: Vector2,
    distance: number,
    depth: number,
  ): void => {
    const world = localPoint.rotate(angle).add(position);

    // Y is negated here to match the sprite pipeline's world-to-render
    // convention (see sprite-instance-data-segment.ts's
    // bindSpriteInstanceData, which negates position.world.y the same way
    // before it reaches the GPU).
    positions.push(world.x, -world.y);
    distances.push(distance);
    depths.push(depth);
  };

  for (let i = 0; i < curvePoints.length - 1; i++) {
    const left = curvePoints[i];
    const right = curvePoints[i + 1];

    const bottomLeft = new Vector2(left.position.x, bottomY);
    const bottomRight = new Vector2(right.position.x, bottomY);
    const depthLeft = bottomY - left.position.y;
    const depthRight = bottomY - right.position.y;

    pushVertex(left.position, left.distance, 0);
    pushVertex(right.position, right.distance, 0);
    pushVertex(bottomLeft, left.distance, depthLeft);

    pushVertex(right.position, right.distance, 0);
    pushVertex(bottomRight, right.distance, depthRight);
    pushVertex(bottomLeft, left.distance, depthLeft);
  }

  return {
    positions: new Float32Array(positions),
    distances: new Float32Array(distances),
    depths: new Float32Array(depths),
    vertexCount: positions.length / 2,
  };
}

function createTerrainGeometry(
  gl: WebGL2RenderingContext,
  meshData: TerrainMeshData,
): Geometry {
  const geometry = new Geometry();

  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, meshData.positions, gl.STATIC_DRAW);
  geometry.addAttribute(gl, 'a_position', { buffer: positionBuffer, size: 2 });

  const distanceBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, distanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, meshData.distances, gl.STATIC_DRAW);
  geometry.addAttribute(gl, 'a_distance', {
    buffer: distanceBuffer,
    size: 1,
  });

  const depthBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, meshData.depths, gl.STATIC_DRAW);
  geometry.addAttribute(gl, 'a_depth', { buffer: depthBuffer, size: 1 });

  return geometry;
}

/**
 * Builds a single triangulated mesh visualizing a `TerrainShape`'s
 * heightmap, textured with a tileable "border" layer near the surface
 * blending into a tileable "fill" layer below it (see
 * `CreateTerrainMeshOptions`). Since the mesh has an arbitrary vertex count
 * - not the fixed six-vertices-per-quad the sprite pipeline batches - draw
 * it with `createTerrainRenderEcsSystem` rather than through
 * `createRenderEcsSystem`.
 * @param renderContext - The render context used to build the mesh's geometry and material.
 * @param options - Sizing and texturing options for the mesh.
 * @returns The built `TerrainMesh`.
 */
export function createTerrainMesh(
  renderContext: RenderContext,
  options: CreateTerrainMeshOptions,
): TerrainMesh {
  const { curvePoints, depth, position, angle, border, fill, borderWidth } =
    options;
  const { borderBlend } = { ...defaultCreateTerrainMeshOptions, ...options };
  const { gl, shaderCache } = renderContext;

  const bottomY =
    Math.max(...curvePoints.map((curvePoint) => curvePoint.position.y)) + depth;

  const meshData = buildTerrainMeshData(curvePoints, bottomY, angle, position);
  const geometry = createTerrainGeometry(gl, meshData);

  const material = new Material(
    shaderCache.getShader('terrain.vert'),
    shaderCache.getShader('terrain.frag'),
    gl,
  );

  material.setUniform(
    'u_fillTexture',
    createTextureFromImage(gl, fill.image, false, true),
  );
  material.setUniform(
    'u_borderTexture',
    createTextureFromImage(gl, border.image, false, true),
  );
  material.setVectorUniform('u_fillTileSize', fill.tileSize);
  material.setVectorUniform('u_borderTileSize', border.tileSize);
  material.setColorUniform('u_fillTint', fill.tint);
  material.setColorUniform('u_borderTint', border.tint);
  material.setUniform('u_borderWidth', borderWidth);
  material.setUniform('u_borderBlend', borderBlend);

  return { geometry, material, vertexCount: meshData.vertexCount };
}
