import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { clamp, Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyId,
  RigidBody,
  TerrainShape,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  ForgeShaderSource,
  Geometry,
  Material,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import terrainVertexShaderSource from '!!raw-loader!./_terrain.vert.glsl';
import terrainFragmentShaderSource from '!!raw-loader!./_terrain.frag.glsl';
import { buildTerrainCurve, heightAtLocalX } from './_terrain-curve';
import { loadTiledTexture } from './_load-tiled-texture';

// How far apart (in local x) the sparse control points the terrain curve is
// built from are. Small enough that a smooth curve through them still reads
// as "rolling hills" rather than a handful of disconnected bumps.
const anchorSpacing = 400;

// How many curve points to sample per anchor-to-anchor segment. Both the
// TerrainShape collision points and the render mesh use this same dense
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

const defaultCreateTerrainOptions = {
  borderBlend: 12,
};

/** The static terrain mesh built by {@link createTerrain}, ready to draw with `createTerrainRenderEcsSystem`. */
export interface TerrainMesh {
  readonly geometry: Geometry;
  readonly material: Material;
  readonly vertexCount: number;
}

export interface RollingBallTerrain {
  /** The terrain's static `RigidBody`, for reference (e.g. grounded checks). */
  body: RigidBody;

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
    controlPoints.push(new Vector2(x, height));
  }

  return controlPoints;
}

interface TerrainMeshData {
  positions: Float32Array;
  distances: Float32Array;
  depths: Float32Array;
  vertexCount: number;
}

function buildTerrainMeshData(
  curvePoints: { position: Vector2; distance: number }[],
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

async function createTerrainMaterial(
  renderContext: RenderContext,
  options: CreateTerrainOptions,
): Promise<Material> {
  const { gl, imageCache } = renderContext;

  const [fillImage, borderImage] = await Promise.all([
    imageCache.getOrLoad(options.fill.textureUrl),
    imageCache.getOrLoad(options.border.textureUrl),
  ]);

  const material = new Material(
    new ForgeShaderSource(terrainVertexShaderSource),
    new ForgeShaderSource(terrainFragmentShaderSource),
    gl,
  );

  material.setUniform('u_fillTexture', loadTiledTexture(gl, fillImage));
  material.setUniform('u_borderTexture', loadTiledTexture(gl, borderImage));
  material.setVectorUniform('u_fillTileSize', options.fill.tileSize);
  material.setVectorUniform('u_borderTileSize', options.border.tileSize);
  material.setColorUniform('u_fillTint', options.fill.tint);
  material.setColorUniform('u_borderTint', options.border.tint);
  material.setUniform('u_borderWidth', options.borderWidth);
  material.setUniform(
    'u_borderBlend',
    options.borderBlend ?? defaultCreateTerrainOptions.borderBlend,
  );

  return material;
}

/**
 * Creates a long, varied-height `TerrainShape` ground body - a smooth curve
 * through sparse, randomly-placed control points (see `_terrain-curve.ts`),
 * rather than a jagged polyline - plus a single triangulated mesh to render
 * it, textured with a tileable border layer near the surface blending into
 * a tileable fill layer below (see `CreateTerrainOptions`). Pair with
 * `createTerrainRenderEcsSystem` to draw the returned `mesh`.
 * @param world - The ECS world to add the terrain entity to.
 * @param renderContext - The render context used to build the terrain mesh's textures and material.
 * @param options - Sizing and texturing options for the terrain.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  options: CreateTerrainOptions,
): Promise<RollingBallTerrain> {
  const { totalWidth } = options;

  const controlPoints = buildControlPoints(totalWidth);
  const curvePoints = buildTerrainCurve(controlPoints, samplesPerSegment);
  const points = curvePoints.map((curvePoint) => curvePoint.position);

  const terrainShape = new TerrainShape(points, terrainDepth);

  // Rotated 180 degrees, same as the Physics demo's terrain: `TerrainShape`
  // always extends its solid slab `depth` units in the +y direction from
  // its surface points (in its own local space), but this demo's gravity
  // pulls bodies toward -y, so the body is flipped to face the right way.
  const angle = Math.PI;
  const position = Vector2.zero;

  const terrainBody = new RigidBody({
    shape: terrainShape,
    position,
    angle,
    isStatic: true,
    friction: 0.9,
  });

  const terrainEntity = world.createEntity();

  world.addComponent(terrainEntity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });

  // `RotationEcsComponent.world` is negated relative to `RigidBody.angle`
  // (see the "Coordinate spaces" note in the Bodies and Shapes guide), the
  // same convention `createPhysicsSyncEcsSystem` uses for every other
  // static body.
  world.addComponent(terrainEntity, rotationId, {
    local: -angle,
    world: -angle,
  });

  world.addComponent(terrainEntity, PhysicsBodyId, {
    physicsBody: terrainBody,
  });

  const meshData = buildTerrainMeshData(
    curvePoints,
    terrainShape.bottomY,
    angle,
    position,
  );

  const [material, geometry] = await Promise.all([
    createTerrainMaterial(renderContext, options),
    Promise.resolve(createTerrainGeometry(renderContext.gl, meshData)),
  ]);

  const spawnX = position.x;

  const worldSurfaceYAt = (worldX: number): number => {
    const localX = position.x - worldX;

    return position.y - heightAtLocalX(curvePoints, localX);
  };

  return {
    body: terrainBody,
    spawnX,
    worldSurfaceYAt,
    mesh: { geometry, material, vertexCount: meshData.vertexCount },
  };
}
