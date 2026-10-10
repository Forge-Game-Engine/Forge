import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
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

// Horizontal distance between sampled height points. Smaller than a wheel,
// so a wheel often touches several surface edges at once.
const pointSpacing = 60;

// How far the solid ground extends below the lowest point.
const terrainDepth = 500;

const groundTextureUrl = getAssetUrl('img/physics/block_square.png');

// Length of the flat launch pad the car spawns on.
const flatStartLength = 400;

const courseLength = 20000;

// Ground behind the spawn point, so the car can reverse off the pad.
const runoffLength = 500;

// Distance over which the hills fade in, so the pad eases into the first
// slope instead of ending in a kink.
const hillRampLength = 400;

/**
 * The ground height at `x`: flat for the launch pad, then two sine waves
 * (rolling hills), a slow climb and a little noise.
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
 * Samples `heightAt` across the course, left to right.
 */
function buildSurfacePoints(random: Random): Vector2[] {
  const points: Vector2[] = [];

  for (
    let x = flatStartLength - runoffLength;
    x <= courseLength;
    x += pointSpacing
  ) {
    points.push({ x, y: heightAt(x, random) });
  }

  return points;
}

function toCurvePoints(points: readonly Vector2[]): TerrainCurvePoint[] {
  const curvePoints: TerrainCurvePoint[] = [
    { position: Vec2.clone(points[0]), distance: 0 },
  ];

  for (let i = 1; i < points.length; i++) {
    const previous = curvePoints[i - 1];
    const position = Vec2.clone(points[i]);
    const distance =
      previous.distance + Vec2.distanceTo(position, previous.position);

    curvePoints.push({ position, distance });
  }

  return curvePoints;
}

/**
 * Builds the course: one `TerrainCollider` for physics and a terrain mesh
 * for rendering, both from the same points so what you see is what the car
 * touches.
 * @returns A point on the launch pad to spawn the car above.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  random: Random,
): Promise<{ groundPosition: Vector2 }> {
  const surfacePoints = buildSurfacePoints(random);
  const terrainCollider = new TerrainCollider(surfacePoints, terrainDepth);

  const position = Vec2.zero;
  const angle = 0;

  const terrainEntity = world.createEntity();

  addPositionComponent(world, terrainEntity, {
    local: Vec2.clone(position),
  });
  addRotationComponent(world, terrainEntity);
  addColliderComponent(world, terrainEntity, {
    collider: terrainCollider,
    friction: 1,
  });

  const groundTexture = await renderContext.textureCache.getOrLoad(
    groundTextureUrl,
    { wrap: 'repeat' },
  );

  const mesh = createTerrainMesh(renderContext, {
    curvePoints: toCurvePoints(surfacePoints),
    depth: terrainDepth,
    position,
    angle,
    border: {
      texture: groundTexture,
      tileSize: { x: 64, y: 64 },
      tint: Color.white,
    },
    fill: {
      texture: groundTexture,
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
