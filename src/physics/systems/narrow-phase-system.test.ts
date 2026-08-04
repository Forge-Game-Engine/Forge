import { beforeEach, describe, expect, it } from 'vitest';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';

describe('createNarrowPhaseEcsSystem', () => {
  let world: EcsWorld;
  let collisionPairs: CollisionPair[];
  let collisionManifolds: CollisionManifold[];

  beforeEach(() => {
    world = new EcsWorld();
    collisionPairs = [];
    collisionManifolds = [];
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
  });

  function addCircleEntity(position: Vector2, radius: number): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: position });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
    });

    return entity;
  }

  it('should produce a manifold for a candidate pair that actually overlaps', () => {
    const entityA = addCircleEntity({ x: 0, y: 0 }, 1);
    const entityB = addCircleEntity({ x: 1, y: 0 }, 1);

    collisionPairs.push({ entityA, entityB });

    world.update();

    expect(collisionManifolds).toHaveLength(1);
    expect(collisionManifolds[0].entityA).toBe(entityA);
    expect(collisionManifolds[0].entityB).toBe(entityB);
    expect(collisionManifolds[0].normal.x).toBeCloseTo(1);
    expect(collisionManifolds[0].depth).toBeCloseTo(1);
  });

  it('should discard a candidate pair that is a false-positive AABB overlap', () => {
    const entityA = addCircleEntity({ x: 0, y: 0 }, 1);
    const entityB = addCircleEntity({ x: 5, y: 0 }, 1);

    collisionPairs.push({ entityA, entityB });

    world.update();

    expect(collisionManifolds).toHaveLength(0);
  });

  it('should skip pairs referencing an entity that no longer has the required components', () => {
    const entityA = addCircleEntity({ x: 0, y: 0 }, 1);

    collisionPairs.push({ entityA, entityB: entityA + 999 });

    world.update();

    expect(collisionManifolds).toHaveLength(0);
  });

  it('should clear stale manifolds from a previous tick', () => {
    const entityA = addCircleEntity({ x: 0, y: 0 }, 1);
    const entityB = addCircleEntity({ x: 1, y: 0 }, 1);

    collisionPairs.push({ entityA, entityB });
    world.update();

    expect(collisionManifolds).toHaveLength(1);

    collisionPairs.length = 0;
    world.update();

    expect(collisionManifolds).toHaveLength(0);
  });
});
