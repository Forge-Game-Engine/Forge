/**
 * Times `raycast`, `queryAabb` and `overlapPoint` over repeatable scenes of
 * growing collider counts, so a change to them can be compared against the
 * numbers it replaces. Every scene has the same density of colliders, and
 * every ray has the same length and every box the same size, so each query
 * reaches about as many colliders in every scene: the time per query should
 * stay roughly flat as the scene grows.
 *
 * Each scene is built and ticked once before timing, so the broad phase's
 * trees are built before the first timed call. Nothing moves afterwards,
 * so every call casts the same rays against the same trees.
 */
import { bench, describe } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import { createBroadPhase } from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import { Aabb } from '../types/aabb.js';
import { overlapPoint } from './overlap-point.js';
import { queryAabb } from './query-aabb.js';
import { raycast } from './raycast.js';

const colliderSize = 10;

// The side of the square each collider gets to itself. The scene's square
// grows with the collider count, so the density stays the same.
const areaPerColliderSide = 40;

const rayCount = 100;
const rayLength = 400;
const boxCount = 100;
const boxSize = 200;
const pointCount = 1_000;

interface Ray {
  start: Vector2;
  end: Vector2;
}

interface Scene {
  world: EcsWorld;
  rays: Ray[];
  boxes: Aabb[];
  points: Vector2[];
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

/**
 * Adds `count` colliders at random places in the square: every other one a
 * static box, the rest dynamic circles, so rays walk both of the broad
 * phase's trees.
 */
function addColliders(
  world: EcsWorld,
  random: Random,
  count: number,
  halfSide: number,
): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: {
        x: random.randomFloat(-halfSide, halfSide),
        y: random.randomFloat(-halfSide, halfSide),
      },
    });
    addRotationComponent(world, entity, {
      local: random.randomFloat(0, Math.PI * 2),
    });

    if (i % 2 === 0) {
      addColliderComponent(world, entity, {
        collider: new PolygonCollider(boxVertices(colliderSize)),
      });

      continue;
    }

    addColliderComponent(world, entity, {
      collider: new CircleCollider(colliderSize / 2),
    });
    addRigidBodyComponent(world, entity);
  }
}

/**
 * Makes {@link rayCount} rays of {@link rayLength}, each starting at a
 * random point in the square and pointing in a random direction.
 */
function createRays(random: Random, halfSide: number): Ray[] {
  const rays: Ray[] = [];

  for (let i = 0; i < rayCount; i++) {
    const start = {
      x: random.randomFloat(-halfSide, halfSide),
      y: random.randomFloat(-halfSide, halfSide),
    };
    const angle = random.randomFloat(0, Math.PI * 2);

    rays.push({
      start,
      end: {
        x: start.x + Math.cos(angle) * rayLength,
        y: start.y + Math.sin(angle) * rayLength,
      },
    });
  }

  return rays;
}

function createPoints(
  random: Random,
  halfSide: number,
  count: number,
): Vector2[] {
  return Array.from({ length: count }, () => ({
    x: random.randomFloat(-halfSide, halfSide),
    y: random.randomFloat(-halfSide, halfSide),
  }));
}

/**
 * Makes {@link boxCount} boxes of {@link boxSize}, each centered on a random
 * point in the square.
 */
function createBoxes(random: Random, halfSide: number): Aabb[] {
  const half = boxSize / 2;

  return createPoints(random, halfSide, boxCount).map(({ x, y }) => ({
    min: { x: x - half, y: y - half },
    max: { x: x + half, y: y + half },
  }));
}

function createScene(name: string, colliderCount: number): Scene {
  const random = new Random(name);
  const halfSide = (Math.sqrt(colliderCount) * areaPerColliderSide) / 2;
  const world = new EcsWorld();

  createBroadPhase(world);
  world.addSystem(createTransformEcsSystem(new Time()));
  world.addSystem(createBroadPhaseEcsSystem([]));
  addColliders(world, random, colliderCount, halfSide);

  // The broad phase builds its trees here, outside the timed calls.
  world.update();

  const rays = createRays(random, halfSide);
  const boxes = createBoxes(random, halfSide);
  const points = createPoints(random, halfSide, pointCount);
  const hitCount = rays.reduce(
    (total, { start, end }) => total + raycast(world, start, end).length,
    0,
  );
  const boxHitCount = boxes.reduce(
    (total, box) => total + queryAabb(world, box).length,
    0,
  );
  const pointHitCount = points.reduce(
    (total, point) => total + overlapPoint(world, point).length,
    0,
  );

  console.log(
    `${name}: ${hitCount / rayCount} hits per ray, ${boxHitCount / boxCount} per box, ${pointHitCount / pointCount} per point`,
  );

  return { world, rays, boxes, points };
}

const scenes = [1_000, 4_000, 16_000].map((colliderCount) => {
  const name = `${colliderCount} colliders`;

  return { name, ...createScene(name, colliderCount) };
});

describe(`raycast: ${rayCount} rays`, () => {
  for (const { name, world, rays } of scenes) {
    bench(name, () => {
      for (const { start, end } of rays) {
        raycast(world, start, end);
      }
    });
  }
});

describe(`queryAabb: ${boxCount} boxes`, () => {
  for (const { name, world, boxes } of scenes) {
    bench(name, () => {
      for (const box of boxes) {
        queryAabb(world, box);
      }
    });
  }
});

describe(`overlapPoint: ${pointCount} points`, () => {
  for (const { name, world, points } of scenes) {
    bench(name, () => {
      for (const point of points) {
        overlapPoint(world, point);
      }
    });
  }
});
