/**
 * Times one tick of the collision detection pipeline (transform, broad
 * phase, narrow phase) over repeatable scenes, so a change to any of those
 * systems can be compared against the numbers it replaces.
 *
 * Each scene is built once and ticked repeatedly. Nothing integrates
 * positions, so every tick does the same work. In the scenes where nothing
 * moves, a broad phase that keeps state between ticks (a dynamic AABB tree,
 * a persistent pair cache) gets every tick after the first almost for free,
 * so compare the "10% moving" scene across such a change: its moving bodies
 * travel two radii every tick, far enough to leave any padded ("fat") AABB.
 */
import { bench, describe } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

const circleRadius = 10;

// The side of the square each dynamic body gets to itself. The scene's
// square grows with the body count, so the density, and with it the number
// of overlapping pairs per body, stays the same in every scene.
const areaPerBodySide = 40;

const staticBoxCount = 500;
const staticBoxSize = 20;
const terrainPointSpacing = 40;
const terrainDepth = 200;
const movingFraction = 0.1;
const moveDistance = circleRadius * 2;

interface SceneOptions {
  name: string;
  dynamicBodyCount: number;
  includeStaticWorld: boolean;
}

interface Scene {
  world: EcsWorld;
  dynamicPositions: PositionEcsComponent[];
}

function boxVertices(size: number): Vector2[] {
  const half = size / 2;

  return [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ];
}

function addDynamicCircles(
  world: EcsWorld,
  random: Random,
  count: number,
  halfSide: number,
): PositionEcsComponent[] {
  const positions: PositionEcsComponent[] = [];

  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();

    positions.push(
      addPositionComponent(world, entity, {
        local: {
          x: random.randomFloat(-halfSide, halfSide),
          y: random.randomFloat(-halfSide, halfSide),
        },
      }),
    );
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(circleRadius),
    });
    addRigidBodyComponent(world, entity);
  }

  return positions;
}

/**
 * Adds static boxes one per cell of a jittered grid over the square. Each
 * box stays inside its cell, so no two boxes overlap: static/static pairs
 * would add narrow-phase work that has nothing to do with the broad phase.
 */
function addStaticBoxes(
  world: EcsWorld,
  random: Random,
  halfSide: number,
): void {
  const columns = Math.ceil(Math.sqrt(staticBoxCount));
  const rows = Math.ceil(staticBoxCount / columns);
  const cellWidth = (halfSide * 2) / columns;
  const cellHeight = (halfSide * 2) / rows;
  const maxJitterX = (cellWidth - staticBoxSize) / 2;
  const maxJitterY = (cellHeight - staticBoxSize) / 2;

  for (let i = 0; i < staticBoxCount; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: {
        x:
          -halfSide +
          (column + 0.5) * cellWidth +
          random.randomFloat(-maxJitterX, maxJitterX),
        y:
          -halfSide +
          (row + 0.5) * cellHeight +
          random.randomFloat(-maxJitterY, maxJitterY),
      },
      isStatic: true,
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new PolygonCollider(boxVertices(staticBoxSize)),
    });
  }
}

/**
 * Adds one terrain collider whose surface runs just below the square's
 * bottom edge, so the bottom band of circles touches it. It stays clear of
 * the static boxes, which end at that edge.
 */
function addTerrain(world: EcsWorld, random: Random, halfSide: number): void {
  const pointCount = Math.ceil((halfSide * 2) / terrainPointSpacing) + 1;
  const points: Vector2[] = [];

  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: -halfSide + i * terrainPointSpacing,
      y: halfSide + random.randomFloat(1, circleRadius / 2),
    });
  }

  const entity = world.createEntity();

  addPositionComponent(world, entity, { isStatic: true });
  addRotationComponent(world, entity);
  addColliderComponent(world, entity, {
    collider: new TerrainCollider(points, terrainDepth),
  });
}

function createScene(options: SceneOptions): Scene {
  const { name, dynamicBodyCount, includeStaticWorld } = options;
  const random = new Random(name);
  const halfSide = (Math.sqrt(dynamicBodyCount) * areaPerBodySide) / 2;

  const world = new EcsWorld();
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );

  const dynamicPositions = addDynamicCircles(
    world,
    random,
    dynamicBodyCount,
    halfSide,
  );

  if (includeStaticWorld) {
    addStaticBoxes(world, random, halfSide);
    addTerrain(world, random, halfSide);
  }

  // One warm-up tick, so the counts below describe the work every timed
  // tick does. A rewrite of either phase should report the same counts.
  world.update();

  console.log(
    `${name}: ${collisionPairs.length} broad-phase pairs, ${collisionManifolds.length} manifolds`,
  );

  return { world, dynamicPositions };
}

const bodyCounts = [500, 2_000, 5_000];

describe('collision pipeline: dynamic circles', () => {
  for (const dynamicBodyCount of bodyCounts) {
    const name = `${dynamicBodyCount} circles`;
    const { world } = createScene({
      name,
      dynamicBodyCount,
      includeStaticWorld: false,
    });

    bench(name, () => {
      world.update();
    });
  }
});

describe('collision pipeline: dynamic circles in a static world', () => {
  for (const dynamicBodyCount of bodyCounts) {
    const name = `${dynamicBodyCount} circles, ${staticBoxCount} static boxes and a terrain`;
    const { world } = createScene({
      name,
      dynamicBodyCount,
      includeStaticWorld: true,
    });

    bench(name, () => {
      world.update();
    });
  }
});

describe('collision pipeline: some bodies moving', () => {
  const name = '2000 circles, 10% moving';
  const { world, dynamicPositions } = createScene({
    name,
    dynamicBodyCount: 2_000,
    includeStaticWorld: false,
  });

  // Bodies are placed in random order, so the first 10% are spread over the
  // whole scene.
  const movingPositions = dynamicPositions.slice(
    0,
    Math.round(dynamicPositions.length * movingFraction),
  );
  let direction = 1;

  bench(name, () => {
    // Vitest runs no hook before each call, so the move is timed too. It's a
    // couple of hundred writes next to millions of pair tests. Alternating
    // the direction keeps the bodies inside the scene however often the
    // benchmark runs.
    for (const position of movingPositions) {
      position.local.x += moveDistance * direction;
    }

    direction = -direction;

    world.update();
  });
});
