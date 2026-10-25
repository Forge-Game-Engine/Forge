/**
 * Times one tick of the collision detection pipeline (transform, broad
 * phase, narrow phase) over repeatable scenes, so a change to any of those
 * systems can be compared against the numbers it replaces. The "broad
 * phase" cases leave the narrow phase out, so its cost doesn't hide the
 * broad phase's.
 *
 * Each scene is built once and ticked repeatedly. Nothing integrates
 * positions, so every tick does the same work. In the scenes where nothing
 * moves, the broad phase keeps its trees and pairs from the warm-up tick,
 * so every timed tick only checks that nothing changed. The "10% moving"
 * scenes move their bodies two radii every tick, far enough to leave their
 * padded ("fat") boxes in the trees.
 *
 * The "continuous collision" cases time the continuous collision system
 * alone, sweeping a fixed group of fast circles through a grid of static
 * boxes that grows away from them, so they show how its cost depends on
 * static colliders far from the moving ones.
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
import { createBroadPhase } from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';
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
  includeNarrowPhase: boolean;
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
 * box stays inside its cell, so no two boxes overlap.
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
  const { name, dynamicBodyCount, includeStaticWorld, includeNarrowPhase } =
    options;
  const random = new Random(name);
  const halfSide = (Math.sqrt(dynamicBodyCount) * areaPerBodySide) / 2;

  const world = new EcsWorld();
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];

  createBroadPhase(world);
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));

  if (includeNarrowPhase) {
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
  }

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

/**
 * Benches ticks of a scene in which the first {@link movingFraction} of its
 * dynamic bodies move every tick.
 */
function benchMovingScene(name: string, scene: Scene): void {
  const { world, dynamicPositions } = scene;
  // Bodies are placed in random order, so the first 10% are spread over the
  // whole scene.
  const movingPositions = dynamicPositions.slice(
    0,
    Math.round(dynamicPositions.length * movingFraction),
  );
  let direction = 1;

  bench(name, () => {
    // Vitest runs no hook before each call, so the move is timed too. It's a
    // few hundred writes. Alternating the direction keeps the bodies inside
    // the scene however often the benchmark runs.
    for (const position of movingPositions) {
      position.local.x += moveDistance * direction;
    }

    direction = -direction;

    world.update();
  });
}

for (const includeNarrowPhase of [true, false]) {
  const stage = includeNarrowPhase ? 'collision pipeline' : 'broad phase';

  describe(`${stage}: dynamic circles`, () => {
    for (const dynamicBodyCount of bodyCounts) {
      const name = `${dynamicBodyCount} circles`;
      const { world } = createScene({
        name,
        dynamicBodyCount,
        includeStaticWorld: false,
        includeNarrowPhase,
      });

      bench(name, () => {
        world.update();
      });
    }
  });

  describe(`${stage}: dynamic circles in a static world`, () => {
    for (const dynamicBodyCount of bodyCounts) {
      const name = `${dynamicBodyCount} circles, ${staticBoxCount} static boxes and a terrain`;
      const { world } = createScene({
        name,
        dynamicBodyCount,
        includeStaticWorld: true,
        includeNarrowPhase,
      });

      bench(name, () => {
        world.update();
      });
    }
  });

  describe(`${stage}: some bodies moving`, () => {
    for (const dynamicBodyCount of bodyCounts) {
      const name = `${dynamicBodyCount} circles, 10% moving`;

      benchMovingScene(
        name,
        createScene({
          name,
          dynamicBodyCount,
          includeStaticWorld: false,
          includeNarrowPhase,
        }),
      );
    }

    const name = `5000 circles, 10% moving, ${staticBoxCount} static boxes and a terrain`;

    benchMovingScene(
      name,
      createScene({
        name,
        dynamicBodyCount: 5_000,
        includeStaticWorld: true,
        includeNarrowPhase,
      }),
    );
  });
}

const sweptCircleCount = 200;
const sweptCircleRadius = 5;
const sweepCellSize = 60;
const sweepBoxSize = 20;
const sweepDistance = sweepCellSize / 2;

// The circles stay in the same 10 x 10 cells of the grid in every scene, so
// the boxes near their paths are the same and only far boxes are added.
const sweptCellsPerSide = 10;

interface SweepScene {
  world: EcsWorld;
  circlePositions: PositionEcsComponent[];
}

/**
 * Builds a grid of `boxCount` static boxes, one at each cell corner, with
 * fast circles between them in the grid's first cells. Each circle moves
 * half a cell to the right per tick; its row is jittered, so about a
 * quarter of them clip a box and are stopped.
 */
function createSweepScene(boxCount: number): SweepScene {
  const random = new Random(`continuous collision ${boxCount}`);
  const world = new EcsWorld();
  const columns = Math.ceil(Math.sqrt(boxCount));

  createBroadPhase(world);

  for (let i = 0; i < boxCount; i++) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: {
        x: (i % columns) * sweepCellSize,
        y: Math.floor(i / columns) * sweepCellSize,
      },
      isStatic: true,
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new PolygonCollider(boxVertices(sweepBoxSize)),
    });
  }

  const circlePositions: PositionEcsComponent[] = [];

  for (let i = 0; i < sweptCircleCount; i++) {
    const entity = world.createEntity();
    const column = random.randomInt(0, sweptCellsPerSide - 1);
    const row = random.randomInt(0, sweptCellsPerSide - 1);
    const jitter = (sweepCellSize - sweepBoxSize) / 2;

    circlePositions.push(
      addPositionComponent(world, entity, {
        local: {
          x: (column + 0.5) * sweepCellSize,
          y: (row + 0.5) * sweepCellSize + random.randomFloat(-jitter, jitter),
        },
      }),
    );
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(sweptCircleRadius),
    });
    addRigidBodyComponent(world, entity);
  }

  // One warm-up tick computes every `world` position, `aabb` and tree, then
  // only the continuous collision system runs, so every timed tick sweeps
  // the same circles from the same start.
  const transformSystem = createTransformEcsSystem();
  const broadPhaseSystem = createBroadPhaseEcsSystem([]);

  world.addSystem(transformSystem);
  world.addSystem(broadPhaseSystem);
  world.update();
  world.removeSystem(transformSystem);
  world.removeSystem(broadPhaseSystem);
  world.addSystem(createContinuousCollisionEcsSystem());

  return { world, circlePositions };
}

describe('continuous collision: fast circles among static boxes', () => {
  for (const boxCount of [500, 2_000, 10_000]) {
    const { world, circlePositions } = createSweepScene(boxCount);

    bench(`${sweptCircleCount} fast circles, ${boxCount} static boxes`, () => {
      // Stands in for integration: each circle moves from its `world`
      // position, which nothing changes between ticks.
      for (const position of circlePositions) {
        position.local.x = position.world.x + sweepDistance;
        position.local.y = position.world.y;
      }

      world.update();
    });
  }
});
