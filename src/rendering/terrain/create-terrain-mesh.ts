import { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import type { MeshRequiredOptions } from '../components/mesh-component.js';
import { Geometry } from '../geometry/index.js';
import { createMeshMaterial } from '../materials/mesh-material.js';
import { RenderContext } from '../render-context.js';
import type { Texture } from '../texture.js';
import type { TerrainCurvePoint } from './terrain-curve.js';
import { withDefaults } from '../../utilities/with-defaults.js';

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
   * They're in the terrain entity's local space, like the collider's, so the
   * mesh follows the entity's world position, rotation and scale.
   */
  curvePoints: readonly TerrainCurvePoint[];

  /**
   * How far (in world units) the mesh extends below its lowest curve
   * point. Must match the `depth` passed to the corresponding
   * `TerrainCollider` for the mesh to align with the collision volume.
   */
  depth: number;

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

interface TerrainMeshData {
  positions: Float32Array;
  distances: Float32Array;
  depths: Float32Array;
}

function buildTerrainMeshData(
  curvePoints: readonly TerrainCurvePoint[],
  bottomY: number,
): TerrainMeshData {
  const positions: number[] = [];
  const distances: number[] = [];
  const depths: number[] = [];

  const pushVertex = (
    localPoint: Vector2,
    distance: number,
    depth: number,
  ): void => {
    positions.push(localPoint.x, localPoint.y);
    distances.push(distance);
    depths.push(depth);
  };

  for (let i = 0; i < curvePoints.length - 1; i++) {
    const left = curvePoints[i];
    const right = curvePoints[i + 1];

    const bottomLeft = { x: left.position.x, y: bottomY };
    const bottomRight = { x: right.position.x, y: bottomY };
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
  };
}

function createTerrainGeometry(
  renderContext: RenderContext,
  meshData: TerrainMeshData,
): Geometry {
  return new Geometry(renderContext, {
    attributes: [
      { name: 'a_position', data: meshData.positions, size: 2 },
      { name: 'a_distance', data: meshData.distances, size: 1 },
      { name: 'a_depth', data: meshData.depths, size: 1 },
    ],
  });
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
 * `CreateTerrainMeshOptions`). The vertices are the curve points as they
 * are, in the terrain entity's local space. Add the result to the terrain
 * entity with `addMeshComponent`, so the render system draws it through
 * the entity's transform, in the same draw order as sprites and text.
 * @param renderContext - The render context used to build the mesh's geometry and material.
 * @param options - Sizing and texturing options for the mesh.
 * @throws An error if a layer's texture doesn't have `wrap: 'repeat'`.
 * @returns The mesh's geometry and material, ready for `addMeshComponent`.
 * The caller owns the geometry.
 */
export function createTerrainMesh(
  renderContext: RenderContext,
  options: CreateTerrainMeshOptions,
): MeshRequiredOptions {
  const { curvePoints, depth, border, fill, borderWidth } = options;
  const { borderBlend } = withDefaults(
    defaultCreateTerrainMeshOptions,
    options,
  );

  assertRepeatingTexture('fill', fill.texture);
  assertRepeatingTexture('border', border.texture);

  // The world is Y-down, so the lowest curve point has the largest Y and
  // the solid slab extends towards +Y from it.
  const bottomY =
    Math.max(...curvePoints.map((curvePoint) => curvePoint.position.y)) + depth;

  const meshData = buildTerrainMeshData(curvePoints, bottomY);
  const geometry = createTerrainGeometry(renderContext, meshData);
  const material = createMeshMaterial(
    renderContext,
    'terrain.vert',
    'terrain.frag',
  );

  material.setUniform('u_fillTexture', fill.texture);
  material.setUniform('u_borderTexture', border.texture);
  material.setVectorUniform('u_fillTileSize', fill.tileSize);
  material.setVectorUniform('u_borderTileSize', border.tileSize);
  material.setColorUniform('u_fillTint', fill.tint);
  material.setColorUniform('u_borderTint', border.tint);
  material.setUniform('u_borderWidth', borderWidth);
  material.setUniform('u_borderBlend', borderBlend);

  return { geometry, material };
}
