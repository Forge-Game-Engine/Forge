import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { clamp, Random, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  TerrainCollider,
} from '@forge-game-engine/forge/physics';
import {
  buildTerrainCurve,
  Color,
  createTerrainMesh,
  heightAtLocalX,
  RenderContext,
  TerrainMesh,
} from '@forge-game-engine/forge/rendering';

// How far apart (in local x) the sparse control points the terrain curve is
// built from are. Small enough that a smooth curve through them still reads
// as "rolling hills" rather than a handful of disconnected bumps.
const anchorSpacing = 400;

// How many curve points to sample per anchor-to-anchor segment. Both the
// TerrainCollider collision points and the render mesh use this same dense
// sampling, so what the ball touches always matches what's drawn.
const samplesPerSegment = 20;

const terrainDepth = 500;
const maxStepHeight = 50;
const minHeight = -180;
const maxHeight = 180;

// The number of anchors, centered on x = 0, held flat at height 0 so the
// ball spawns on a predictable platform instead of partway up a slope.
const flatAnchorRadius = 1;

/**
 * Texture and tiling options for one of the terrain's two texture layers
 * (see {@link CreateTerrainOptions}).
 */
export interface TerrainLayerOptions {
  /** URL of the image to tile across this layer. */
  textureUrl: string;

  /**
   * The world-space size of one tile of the texture: x tiles along the
   * curve's arc length, y tiles into the ground. Smaller values repeat the
   * texture more often over the same span of terrain.
   */
  tileSize: Vector2;

  /** Tint multiplied against the sampled texture. */
  tint: Color;
}

export interface CreateTerrainOptions {
  /** The total width of the terrain, in world units. */
  totalWidth: number;

  /** The texture tiled across the terrain's surface, from the surface down to `borderWidth`. */
  border: TerrainLayerOptions;

  /** The texture tiled across the terrain's interior, below `borderWidth`. */
  fill: TerrainLayerOptions;

  /**
   * How deep (in world units) the border layer extends below the surface
   * before blending into the fill layer.
   */
  borderWidth: number;

  /**
   * How wide (in world units) the blend between the border and fill layers
   * is, centered on `borderWidth`.
   */
  borderBlend: number;
}

export interface RollingBallTerrain {
  /** The terrain's static entity id, for reference (e.g. grounded checks). */
  entity: number;

  /**
   * The world-space x coordinate of the flat platform the ball spawns on,
   * near the start of the terrain.
   */
  spawnX: number;

  /**
   * Returns the world-space y coordinate of the terrain's surface at a
   * given world-space x. Used to place the ball (and anything else) exactly
   * on the ground, accounting for the terrain body's rotation (see below).
   */
  worldSurfaceYAt: (worldX: number) => number;

  /** The terrain's render mesh, for `createTerrainRenderEcsSystem`. */
  mesh: TerrainMesh;
}

function buildControlPoints(totalWidth: number): Vector2[] {
  const halfWidth = totalWidth / 2;
  const anchorCount = Math.round(totalWidth / anchorSpacing) + 1;
  const random = new Random('rolling-ball-terrain');

  const controlPoints: Vector2[] = [];
  let previousHeight = 0;

  for (let i = 0; i < anchorCount; i++) {
    const x =
      i === anchorCount - 1 ? halfWidth : -halfWidth + i * anchorSpacing;
    const isFlatZone = Math.abs(x) <= anchorSpacing * flatAnchorRadius + 1;

    let height: number;

    if (isFlatZone) {
      height = 0;
    } else {
      const step = random.randomFloat(-maxStepHeight, maxStepHeight);

      height = clamp(previousHeight + step, minHeight, maxHeight);
    }

    previousHeight = height;
    controlPoints.push({ x, y: height });
  }

  return controlPoints;
}

/**
 * Creates a long, varied-height `TerrainCollider` ground body - a smooth
 * curve through sparse, randomly-placed control points (see
 * `buildTerrainCurve`), rather than a jagged polyline - plus a single
 * triangulated mesh to render it (see `createTerrainMesh`), textured with a
 * tileable border layer near the surface blending into a tileable fill
 * layer below (see `CreateTerrainOptions`). Pair with
 * `createTerrainRenderEcsSystem` to draw the returned `mesh`.
 * @param world - The ECS world to add the terrain entity to.
 * @param renderContext - The render context used to load the terrain's textures and build its mesh.
 * @param options - Sizing and texturing options for the terrain.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  options: CreateTerrainOptions,
): Promise<RollingBallTerrain> {
  const { totalWidth, border, fill, borderWidth, borderBlend } = options;

  const controlPoints = buildControlPoints(totalWidth);
  const curvePoints = buildTerrainCurve(controlPoints, samplesPerSegment);
  const points = curvePoints.map((curvePoint) => curvePoint.position);

  const terrainCollider = new TerrainCollider(points, terrainDepth);

  // Rotated 180 degrees, same as the Physics demo's terrain: `TerrainCollider`
  // always extends its solid slab `depth` units in the +y direction from
  // its surface points (in its own local space), but this demo's gravity
  // pulls bodies toward -y, so the body is flipped to face the right way.
  const angle = Math.PI;
  const position = Vec2.zero;

  const terrainEntity = world.createEntity();

  addPositionComponent(world, terrainEntity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });

  addRotationComponent(world, terrainEntity, {
    local: angle,
    world: angle,
  });

  addColliderComponent(world, terrainEntity, {
    collider: terrainCollider,
    friction: 0.9,
  });
  addAabbComponent(world, terrainEntity);

  const [borderImage, fillImage] = await Promise.all([
    renderContext.imageCache.getOrLoad(border.textureUrl),
    renderContext.imageCache.getOrLoad(fill.textureUrl),
  ]);

  const mesh = createTerrainMesh(renderContext, {
    curvePoints,
    depth: terrainDepth,
    position,
    angle,
    border: {
      image: borderImage,
      tileSize: border.tileSize,
      tint: border.tint,
    },
    fill: {
      image: fillImage,
      tileSize: fill.tileSize,
      tint: fill.tint,
    },
    borderWidth,
    borderBlend,
  });

  const spawnX = position.x;

  const worldSurfaceYAt = (worldX: number): number => {
    const localX = position.x - worldX;

    return position.y - heightAtLocalX(curvePoints, localX);
  };

  return {
    entity: terrainEntity,
    spawnX,
    worldSurfaceYAt,
    mesh,
  };
}
