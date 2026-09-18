import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  TerrainCollider,
} from '@forge-game-engine/forge/physics';
import {
  addTerrainMeshComponent,
  Color,
  createTerrainMesh,
  RenderContext,
  TerrainCurvePoint,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// How far apart (in world x) consecutive sampled height points are. Small
// enough, relative to the wheel radius (see `wheelRadius` in
// `_create-car.ts`), that a wheel still rests on more than one segment at
// once - deliberately keeping the exact multi-segment resting scenario the
// old column-based terrain (each column its own `PolygonCollider` entity)
// couldn't exercise, since `TerrainCollider` is a single collider whose
// narrow phase picks one winning segment per tick (see
// `detectCircleTerrainCollision`/`detectPolygonTerrainCollision`).
const pointSpacing = 60;

// How far the solid slab extends below the lowest sampled point. A single
// flat bottom edge for the whole course, so this only needs to cover the
// tallest hill's height *above* the flat launch pad, not the pad's own
// height (see `TerrainCollider`'s docs: `depth` is measured from the
// lowest point across the whole collider).
const terrainDepth = 500;

// `block_square.png` is a 64x64 rounded, bolted panel; tiled at its native
// size it reads as a plated floor rather than smearing across the whole
// course.
const groundTextureUrl = getAssetUrl('img/physics/block_square.png');

/**
 * How far the flat launch pad the car spawns on extends before the terrain
 * starts climbing, in world units.
 */
const flatStartLength = 400;

/**
 * Total horizontal distance the generated course covers, including the
 * flat launch pad.
 */
const courseLength = 20000;

/**
 * How far before the flat launch pad the sampled terrain starts, so the car
 * always has solid ground under it even while braking/reversing near the
 * spawn point.
 */
const runoffLength = 500;

/**
 * How far past `flatStartLength` the hills take to ramp up to full
 * amplitude. Without this, `rollingHills`/`climb`/`noise` would switch on
 * abruptly at `flatStartLength`, and since their slope there is nonzero,
 * that would make the very first sampled point a sharp kink (a car arriving
 * at speed would feel a sudden bump rather than easing onto a slope).
 * Smoothstep ramps `rollingHills`/`climb`/`noise` in with a slope of zero at
 * `flatStartLength`, so the ground eases out of the flat pad instead of
 * kinking.
 */
const hillRampLength = 400;

/**
 * Computes the ground height at `x`: flat for `flatStartLength`, then a mix
 * of two sine waves at different frequencies (rolling hills), a slow upward
 * trend (so the course is a net "climb" rather than just undulating), and
 * small per-point noise so it doesn't read as perfectly periodic - all
 * ramped in smoothly over `hillRampLength` so the transition out of the
 * flat pad has no sudden change in slope.
 * @param x - The world-space x coordinate to sample.
 * @param random - The seeded random source used for per-point noise.
 */
function heightAt(x: number, random: Random): number {
  if (x <= flatStartLength) {
    return 0;
  }

  const distanceIntoHills = x - flatStartLength;

  const rollingHills =
    Math.sin(distanceIntoHills * 0.0012) * 90 +
    Math.sin(distanceIntoHills * 0.0035 + 1.7) * 40;
  const climb = distanceIntoHills * 0.04;
  const noise = random.randomFloat(-3, 3);

  const rampT = Math.min(distanceIntoHills / hillRampLength, 1);
  const ramp = rampT * rampT * (3 - 2 * rampT);

  return (rollingHills + climb + noise) * ramp;
}

/**
 * Samples `heightAt` left to right across the whole course, then reverses
 * and negates both axes into `TerrainCollider`'s local space. `TerrainCollider`
 * always extends its solid slab `depth` units in the +y direction from its
 * surface points (in its own local space), but this demo's gravity (the
 * engine default) pulls bodies toward -y, so the terrain entity is rotated
 * 180 degrees to face the right way (the same convention documented in
 * documentation-site/docs/docs/physics/terrain.md and used by the Rolling
 * Ball demo) - which mirrors world space into local space (`local = -world`
 * around the terrain's own position), so the points must be authored in
 * reverse, strictly-increasing-local-x order for that mirroring to land
 * back in the correct left-to-right world layout.
 * @param random - The seeded random source used for per-point noise.
 */
function buildLocalPoints(random: Random): Vector2[] {
  const worldPoints: Vector2[] = [];

  for (
    let x = flatStartLength - runoffLength;
    x <= courseLength;
    x += pointSpacing
  ) {
    worldPoints.push({ x, y: heightAt(x, random) });
  }

  worldPoints.reverse();

  return worldPoints.map((point) => ({ x: -point.x, y: -point.y }));
}

function toCurvePoints(localPoints: readonly Vector2[]): TerrainCurvePoint[] {
  const curvePoints: TerrainCurvePoint[] = [
    { position: Vec2.clone(localPoints[0]), distance: 0 },
  ];

  for (let i = 1; i < localPoints.length; i++) {
    const previous = curvePoints[i - 1];
    const position = Vec2.clone(localPoints[i]);
    const distance =
      previous.distance + Vec2.distanceTo(position, previous.position);

    curvePoints.push({ position, distance });
  }

  return curvePoints;
}

/**
 * Builds the course's terrain: a single, continuous `TerrainCollider`
 * following a procedurally generated height profile, starting with a flat
 * launch pad and climbing into gently rolling hills, plus a matching mesh
 * (see `createTerrainMesh`) built from the exact same points, so what's
 * drawn always matches what's touched. The mesh is attached to the terrain
 * entity via `addTerrainMeshComponent`, so `createTerrainRenderEcsSystem`
 * draws it automatically - the caller doesn't need to wire it up itself.
 * @param world - The ECS world to add the terrain entity to.
 * @param renderContext - The render context used to load the ground texture and build the mesh.
 * @param random - The seeded random source used to vary the terrain.
 * @returns A point on the flat launch pad, suitable for spawning the car above.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  random: Random,
): Promise<{ groundPosition: Vector2 }> {
  const localPoints = buildLocalPoints(random);
  const terrainCollider = new TerrainCollider(localPoints, terrainDepth);

  const position = Vec2.zero;
  const angle = Math.PI;

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
    friction: 1,
  });
  addAabbComponent(world, terrainEntity);

  const groundImage =
    await renderContext.imageCache.getOrLoad(groundTextureUrl);

  const mesh = createTerrainMesh(renderContext, {
    curvePoints: toCurvePoints(localPoints),
    depth: terrainDepth,
    position,
    angle,
    border: {
      image: groundImage,
      tileSize: { x: 64, y: 64 },
      tint: Color.white,
    },
    fill: {
      image: groundImage,
      tileSize: { x: 96, y: 96 },
      tint: new Color(0.55, 0.55, 0.55, 1),
    },
    borderWidth: 40,
  });

  addTerrainMeshComponent(world, terrainEntity, { mesh });

  const carSpawnX = 150;

  return {
    groundPosition: { x: carSpawnX, y: heightAt(carSpawnX, random) },
  };
}
