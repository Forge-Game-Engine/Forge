import { Vec2, Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import { Geometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import type { Texture } from '../texture.js';
import type { TerrainCurvePoint } from './terrain-curve.js';

/**
 * Texture and tiling options for one of a terrain mesh's two texture
 * layers (see {@link CreateTerrainMeshOptions}).
 */
export interface TerrainMeshLayerOptions {
  /**
   * The texture to tile across this layer. Create it with
   * `wrap: 'repeat'`, so it tiles instead of stretching its edge texels.
   */
  texture: Texture;

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
   * Pass the same points used to build the corresponding `TerrainCollider` (by
   * mapping each `TerrainCurvePoint.position` into the `Vector2[]`
   * `TerrainCollider` expects), so what's drawn always matches what's touched.
   */
  curvePoints: readonly TerrainCurvePoint[];

  /**
   * How far (in world units) the mesh extends below its lowest curve
   * point. Must match the `depth` passed to the corresponding
   * `TerrainCollider` for the mesh to align with the collision volume.
   */
  depth: number;

  /**
   * The world-space position of the mesh. Must match the world position
   * of the corresponding `TerrainCollider`'s entity. The mesh's vertices
   * are baked into world space, so the mesh doesn't follow the entity.
   */
  position: Vector2;

  /**
   * The world-space rotation of the mesh, in radians. Must match the world
   * rotation of the corresponding `TerrainCollider`'s entity.
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
    // Clone before rotating: `localPoint` may be reused for multiple
    // vertices (e.g. a curve point shared between adjacent triangles, or a
    // shared bottom corner within the same quad).
    const world = Vec2.add(
      Vec2.rotate(Vec2.clone(localPoint), angle),
      position,
    );

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

    const bottomLeft = { x: left.position.x, y: bottomY };
    const bottomRight = { x: right.position.x, y: bottomY };
    const depthLeft = left.position.y - bottomY;
    const depthRight = right.position.y - bottomY;

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
  renderContext: RenderContext,
  meshData: TerrainMeshData,
): Geometry {
  return new Geometry(renderContext, [
    { name: 'a_position', data: meshData.positions, size: 2 },
    { name: 'a_distance', data: meshData.distances, size: 1 },
    { name: 'a_depth', data: meshData.depths, size: 1 },
  ]);
}

function assertRepeatingTexture(layer: string, texture: Texture): void {
  if (texture.wrap !== 'repeat') {
    throw new Error(
      `createTerrainMesh tiles its ${layer} texture across the terrain, so it must be created with wrap: 'repeat' (it has wrap: '${texture.wrap}').`,
    );
  }
}

/**
 * Builds a single triangulated mesh visualizing a `TerrainCollider`'s
 * heightmap, textured with a tileable "border" layer near the surface
 * blending into a tileable "fill" layer below it (see
 * `CreateTerrainMeshOptions`). Since the mesh has an arbitrary vertex count
 * - not the fixed six-vertices-per-quad the sprite pipeline batches - draw
 * it with `createTerrainRenderEcsSystem` rather than through
 * `createRenderEcsSystem`.
 * @param renderContext - The render context used to build the mesh's geometry and material.
 * @param options - Sizing and texturing options for the mesh.
 * @throws An error if a layer's texture doesn't have `wrap: 'repeat'`.
 * @returns The built `TerrainMesh`.
 */
export function createTerrainMesh(
  renderContext: RenderContext,
  options: CreateTerrainMeshOptions,
): TerrainMesh {
  const { curvePoints, depth, position, angle, border, fill, borderWidth } =
    options;
  const { borderBlend } = { ...defaultCreateTerrainMeshOptions, ...options };
  const { shaderCache } = renderContext;

  const bottomY =
    Math.min(...curvePoints.map((curvePoint) => curvePoint.position.y)) - depth;

  const meshData = buildTerrainMeshData(curvePoints, bottomY, angle, position);
  const geometry = createTerrainGeometry(renderContext, meshData);

  assertRepeatingTexture('fill', fill.texture);
  assertRepeatingTexture('border', border.texture);

  const material = new Material(
    renderContext,
    shaderCache.getShader('terrain.vert'),
    shaderCache.getShader('terrain.frag'),
  );

  material.setUniform('u_fillTexture', fill.texture);
  material.setUniform('u_borderTexture', border.texture);
  material.setVectorUniform('u_fillTileSize', fill.tileSize);
  material.setVectorUniform('u_borderTileSize', border.tileSize);
  material.setColorUniform('u_fillTint', fill.tint);
  material.setColorUniform('u_borderTint', border.tint);
  material.setUniform('u_borderWidth', borderWidth);
  material.setUniform('u_borderBlend', borderBlend);

  return { geometry, material, vertexCount: meshData.vertexCount };
}
