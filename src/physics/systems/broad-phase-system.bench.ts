import { bench, describe } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsWorld, QueryResult } from '../../ecs/index.js';
import { Random } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { CollisionPair } from '../types/collision-pair.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';

const colliderCounts = [100, 1_000, 5_000];

// The world grows with the collider count, so each collider overlaps about
// as many others at every size.
const areaPerCollider = 16;

const box = [
  { x: -0.5, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: 0.5, y: 0.5 },
  { x: -0.5, y: 0.5 },
];

/**
 * Builds `count` colliders, alternately unit circles and rotated unit
 * boxes, scattered at random.
 */
function createColliderWorld(count: number): EcsWorld {
  const world = new EcsWorld();
  const random = new Random('broad-phase-bench');
  const halfSide = Math.sqrt(count * areaPerCollider) / 2;

  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: {
        x: random.randomFloat(-halfSide, halfSide),
        y: random.randomFloat(-halfSide, halfSide),
      },
    });
    addRotationComponent(world, entity, { local: random.randomFloat(0, 6) });
    addColliderComponent(world, entity, {
      collider:
        i % 2 === 0 ? new CircleCollider(0.5) : new PolygonCollider(box),
    });
  }

  return world;
}

describe('broad phase', () => {
  for (const count of colliderCounts) {
    const world = createColliderWorld(count);
    const collisionPairs: CollisionPair[] = [];
    const system = createBroadPhaseEcsSystem(collisionPairs);
    const queryResult: QueryResult<
      [PositionEcsComponent, ColliderEcsComponent]
    > = world.query([positionId, colliderId]);

    bench(`${count.toLocaleString('en-US')} colliders`, () => {
      system.update(world, queryResult);
    });
  }
});
