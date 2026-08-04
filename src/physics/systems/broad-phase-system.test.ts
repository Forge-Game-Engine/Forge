import { beforeEach, describe, expect, it } from 'vitest';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  PositionEcsComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  AabbEcsComponent,
  addAabbComponent,
} from '../components/aabb-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import { CollisionPair } from '../types/collision-pair.js';

describe('createBroadPhaseEcsSystem', () => {
  let world: EcsWorld;
  let collisionPairs: CollisionPair[];

  beforeEach(() => {
    world = new EcsWorld();
    collisionPairs = [];
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  });

  function addCircleEntity(
    position: Vector2,
    radius: number,
  ): {
    entity: number;
    position: PositionEcsComponent;
    aabb: AabbEcsComponent;
  } {
    const entity = world.createEntity();

    const positionComponent = addPositionComponent(world, entity, {
      world: position,
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
    });
    const aabb = addAabbComponent(world, entity);

    return { entity, position: positionComponent, aabb };
  }

  it('should update the AABB component from the collider', () => {
    const { aabb } = addCircleEntity({ x: 2, y: 3 }, 1);

    world.update();

    expect(aabb.min.x).toBeCloseTo(1);
    expect(aabb.min.y).toBeCloseTo(2);
    expect(aabb.max.x).toBeCloseTo(3);
    expect(aabb.max.y).toBeCloseTo(4);
  });

  it('should output a collision pair for overlapping entities', () => {
    const { entity: entityA } = addCircleEntity({ x: 0, y: 0 }, 1);
    const { entity: entityB } = addCircleEntity({ x: 1, y: 0 }, 1);

    world.update();

    expect(collisionPairs).toHaveLength(1);
    expect(collisionPairs[0]).toEqual({ entityA, entityB });
  });

  it('should not output a pair for entities that are far apart', () => {
    addCircleEntity({ x: 0, y: 0 }, 1);
    addCircleEntity({ x: 100, y: 0 }, 1);

    world.update();

    expect(collisionPairs).toHaveLength(0);
  });

  it('should clear stale pairs when entities no longer overlap', () => {
    const { position } = addCircleEntity({ x: 0, y: 0 }, 1);

    addCircleEntity({ x: 1, y: 0 }, 1);

    world.update();

    expect(collisionPairs).toHaveLength(1);

    position.world = { x: 100, y: 0 };
    world.update();

    expect(collisionPairs).toHaveLength(0);
  });
});
