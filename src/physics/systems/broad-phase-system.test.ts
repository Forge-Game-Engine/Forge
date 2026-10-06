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
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
} from '../components/collider-component.js';
import { Aabb } from '../types/aabb.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

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
    collider: ColliderEcsComponent;
  } {
    const entity = world.createEntity();

    const positionComponent = addPositionComponent(world, entity, {
      local: position,
    });
    addRotationComponent(world, entity);
    const collider = addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
    });

    return { entity, position: positionComponent, collider };
  }

  it("should update the collider's AABB from its shape and position", () => {
    const {
      collider: { aabb },
    } = addCircleEntity({ x: 2, y: 3 }, 1);

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

  describe('without a rotation component', () => {
    function addUnrotatedEntity(
      position: Vector2,
      collider: CircleCollider | PolygonCollider,
    ): { entity: number; aabb: Aabb } {
      const entity = world.createEntity();

      addPositionComponent(world, entity, { local: position });
      const { aabb } = addColliderComponent(world, entity, { collider });

      return { entity, aabb };
    }

    it("should still update the collider's AABB, treating rotation as 0", () => {
      const { aabb } = addUnrotatedEntity(
        { x: 0, y: 0 },
        new PolygonCollider([
          { x: -2, y: -1 },
          { x: 2, y: -1 },
          { x: 2, y: 1 },
          { x: -2, y: 1 },
        ]),
      );

      world.update();

      expect(aabb.min.x).toBeCloseTo(-2);
      expect(aabb.min.y).toBeCloseTo(-1);
      expect(aabb.max.x).toBeCloseTo(2);
      expect(aabb.max.y).toBeCloseTo(1);
    });

    it('should still respect the rotation of entities that have one', () => {
      const entity = world.createEntity();

      addPositionComponent(world, entity);
      addRotationComponent(world, entity, {
        local: Math.PI / 2,
      });
      const { aabb } = addColliderComponent(world, entity, {
        collider: new PolygonCollider([
          { x: -2, y: -1 },
          { x: 2, y: -1 },
          { x: 2, y: 1 },
          { x: -2, y: 1 },
        ]),
      });

      world.update();

      expect(aabb.min.x).toBeCloseTo(-1);
      expect(aabb.min.y).toBeCloseTo(-2);
      expect(aabb.max.x).toBeCloseTo(1);
      expect(aabb.max.y).toBeCloseTo(2);
    });

    it('should output a collision pair when it overlaps another collider', () => {
      const { entity: rotated } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: unrotated } = addUnrotatedEntity(
        { x: 1, y: 0 },
        new CircleCollider(0.5),
      );

      world.update();

      expect(collisionPairs).toEqual([
        { entityA: rotated, entityB: unrotated },
      ]);
    });

    it('should produce a manifold once run through the narrow phase', () => {
      const collisionManifolds: CollisionManifold[] = [];

      world.addSystem(
        createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
      );

      const { entity: ship } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: trigger } = addUnrotatedEntity(
        { x: 1, y: 0 },
        new CircleCollider(0.5),
      );

      world.update();

      expect(collisionManifolds).toHaveLength(1);
      expect(collisionManifolds[0].entityA).toBe(ship);
      expect(collisionManifolds[0].entityB).toBe(trigger);
    });
  });

  describe('collision filtering', () => {
    function addFilteredEntity(
      x: number,
      category: number,
      mask: number,
    ): number {
      const entity = world.createEntity();

      addPositionComponent(world, entity, { local: { x, y: 0 } });
      addColliderComponent(world, entity, {
        collider: new CircleCollider(1),
        category,
        mask,
      });

      return entity;
    }

    it('should pair colliders whose categories are in both masks', () => {
      const entityA = addFilteredEntity(0, 0b01, 0b10);
      const entityB = addFilteredEntity(1, 0b10, 0b01);

      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
    });

    it('should skip a pair when the first mask excludes the second category', () => {
      addFilteredEntity(0, 0b01, 0b01);
      addFilteredEntity(1, 0b10, 0b11);

      world.update();

      expect(collisionPairs).toHaveLength(0);
    });

    it('should skip a pair when the second mask excludes the first category', () => {
      addFilteredEntity(0, 0b01, 0b11);
      addFilteredEntity(1, 0b10, 0b10);

      world.update();

      expect(collisionPairs).toHaveLength(0);
    });

    it('should pair colliders in the 32nd category bit', () => {
      const highBit = 1 << 31;
      const entityA = addFilteredEntity(0, highBit, highBit);
      const entityB = addFilteredEntity(1, highBit, highBit);

      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
    });

    it('should pair every collider by default', () => {
      const entityA = world.createEntity();
      const entityB = world.createEntity();

      addPositionComponent(world, entityA);
      addColliderComponent(world, entityA, {
        collider: new CircleCollider(1),
      });
      addPositionComponent(world, entityB);
      addColliderComponent(world, entityB, {
        collider: new CircleCollider(1),
        category: 1 << 5,
      });

      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
    });
  });
});
