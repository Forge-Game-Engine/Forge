import { beforeEach, describe, expect, it } from 'vitest';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import {
  createBroadPhase,
  findBroadPhase,
} from '../broad-phase/create-broad-phase.js';
import { getColliderRotation } from '../collider-rotation.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { collidersCanCollide } from '../collision/collision-filter.js';
import { addBroadPhaseComponent } from '../components/broad-phase-component.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  rigidBodyId,
  RigidBodyType,
} from '../components/rigidbody-component.js';
import { isStaticBody } from '../is-static-body.js';
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
    createBroadPhase(world);
    world.addSystem(createTransformEcsSystem());
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  });

  function addCircleEntity(
    position: Vector2,
    radius: number,
    type: RigidBodyType | null = 'kinematic',
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

    if (type !== null) {
      addRigidBodyComponent(world, entity, { type });
    }

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

    position.local = { x: 100, y: 0 };
    world.update();

    expect(collisionPairs).toHaveLength(0);
  });

  it('should throw when the world has no broad phase', () => {
    const other = new EcsWorld();

    other.addSystem(createBroadPhaseEcsSystem([]));

    expect(() => other.update()).toThrow(/createBroadPhase\(world\)/);
  });

  it('should throw when a world gets a second broad phase', () => {
    expect(() => createBroadPhase(world)).toThrow(/already has a broad phase/);
  });

  it('should throw when the world has more than one broad phase', () => {
    addBroadPhaseComponent(world, world.createEntity());

    expect(() => world.update()).toThrow(/2 broad phases/);
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
      addRigidBodyComponent(world, entity, { type: 'kinematic' });

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
      const { entity: entityA } = addCircleEntity({ x: 0, y: 0 }, 1);
      const entityB = world.createEntity();

      addPositionComponent(world, entityB);
      addColliderComponent(world, entityB, {
        collider: new CircleCollider(1),
        category: 1 << 5,
      });

      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
    });

    it('should drop a resting pair when a mask change excludes it, and restore it when changed back', () => {
      const { entity: entityA, collider } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: entityB } = addCircleEntity({ x: 1, y: 0 }, 1);

      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);

      collider.mask = 0;
      world.update();

      expect(collisionPairs).toEqual([]);
      expect(findBroadPhase(world).pairs).toHaveLength(0);

      collider.mask = 1;
      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
    });
  });

  describe('static colliders', () => {
    it('should never pair two overlapping static colliders', () => {
      addCircleEntity({ x: 0, y: 0 }, 1, null);
      addCircleEntity({ x: 1, y: 0 }, 1, 'static');
      addCircleEntity({ x: 0.5, y: 0 }, 1, null);

      world.update();

      expect(collisionPairs).toEqual([]);
    });

    it.each<RigidBodyType>(['kinematic', 'dynamic'])(
      'should pair a %s body with the static colliders it overlaps',
      (type) => {
        const { entity: wall } = addCircleEntity({ x: 0, y: 0 }, 1, null);
        const { entity: floor } = addCircleEntity({ x: 2, y: 0 }, 1, 'static');
        const { entity: body } = addCircleEntity({ x: 1, y: 0 }, 1, type);

        world.update();

        expect(collisionPairs).toEqual([
          { entityA: wall, entityB: body },
          { entityA: floor, entityB: body },
        ]);
      },
    );

    it('should pair a static collider that game code moves with a body it reaches', () => {
      const { entity: paddle, position } = addCircleEntity(
        { x: 10, y: 0 },
        1,
        null,
      );
      const { entity: ball } = addCircleEntity({ x: 0, y: 0 }, 1, 'dynamic');

      world.update();

      expect(collisionPairs).toEqual([]);

      position.local = { x: 1, y: 0 };
      world.update();

      expect(collisionPairs).toEqual([{ entityA: paddle, entityB: ball }]);
    });

    it("should move a proxy between trees when its body's type changes", () => {
      const { entity: wall } = addCircleEntity({ x: 0, y: 0 }, 1, null);
      const { entity: body } = addCircleEntity({ x: 1, y: 0 }, 1, 'dynamic');
      const broadPhase = findBroadPhase(world);
      const rigidBody = world.getComponentRequired<RigidBodyEcsComponent>(
        body,
        rigidBodyId,
      );

      world.update();

      expect(collisionPairs).toEqual([{ entityA: wall, entityB: body }]);
      expect(broadPhase.movingTree.proxyCount).toBe(1);

      rigidBody.type = 'static';
      world.update();

      expect(collisionPairs).toEqual([]);
      expect(broadPhase.staticTree.proxyCount).toBe(2);
      expect(broadPhase.movingTree.proxyCount).toBe(0);

      rigidBody.type = 'dynamic';
      world.update();

      expect(collisionPairs).toEqual([{ entityA: wall, entityB: body }]);
      expect(broadPhase.staticTree.proxyCount).toBe(1);
      expect(broadPhase.movingTree.proxyCount).toBe(1);
    });

    it('should move a proxy between trees when its rigid body is removed or added', () => {
      const { entity: wall } = addCircleEntity({ x: 0, y: 0 }, 1, null);
      const { entity: body } = addCircleEntity({ x: 1, y: 0 }, 1, 'dynamic');

      world.update();
      world.removeComponent(body, rigidBodyId);
      world.update();

      expect(collisionPairs).toEqual([]);

      addRigidBodyComponent(world, body, { type: 'kinematic' });
      world.update();

      expect(collisionPairs).toEqual([{ entityA: wall, entityB: body }]);
    });
  });

  describe('pair lifetime', () => {
    it('should keep a pair, and its proxies, when a body moves within its margin', () => {
      const { entity: entityA, position } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: entityB } = addCircleEntity({ x: 1, y: 0 }, 1);
      const broadPhase = findBroadPhase(world);

      world.update();

      const pair = collisionPairs[0];
      const record = broadPhase.proxies.get(entityA);
      const fatAabb = structuredClone(record?.fatAabb);

      position.local = { x: 0.05, y: 0 };
      world.update();

      expect(collisionPairs).toEqual([{ entityA, entityB }]);
      expect(collisionPairs[0]).toBe(pair);
      expect(record?.fatAabb).toEqual(fatAabb);
    });

    it('should drop a pair from the output when the tight boxes separate, and from the cache when the fat boxes do', () => {
      const { position } = addCircleEntity({ x: 0, y: 0 }, 1);

      addCircleEntity({ x: 1.9, y: 0 }, 1);

      const broadPhase = findBroadPhase(world);

      world.update();

      expect(collisionPairs).toHaveLength(1);

      // Tight boxes 0.05 apart: still inside both margins.
      position.local = { x: -0.15, y: 0 };
      world.update();

      expect(collisionPairs).toHaveLength(0);
      expect(broadPhase.pairs).toHaveLength(1);

      position.local = { x: -5, y: 0 };
      world.update();

      expect(collisionPairs).toHaveLength(0);
      expect(broadPhase.pairs).toHaveLength(0);
    });

    it('should drop the proxy and its pairs when the collider is removed', () => {
      const { entity } = addCircleEntity({ x: 0, y: 0 }, 1);

      addCircleEntity({ x: 1, y: 0 }, 1);

      const broadPhase = findBroadPhase(world);

      world.update();
      world.removeComponent(entity, colliderId);
      world.update();

      expect(collisionPairs).toEqual([]);
      expect(broadPhase.pairs).toHaveLength(0);
      expect(broadPhase.proxies.has(entity)).toBe(false);
      expect(broadPhase.movingTree.proxyCount).toBe(1);
    });

    it('should drop the proxy and its pairs when the position is removed', () => {
      const { entity } = addCircleEntity({ x: 0, y: 0 }, 1);

      addCircleEntity({ x: 1, y: 0 }, 1);

      world.update();
      world.removeComponent(entity, positionId);
      world.update();

      expect(collisionPairs).toEqual([]);
      expect(findBroadPhase(world).movingTree.proxyCount).toBe(1);
    });

    it('should tell a removed entity apart from a new one that reuses its slot', () => {
      const { entity: removed } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: other } = addCircleEntity({ x: 1, y: 0 }, 1);

      world.update();
      world.removeEntity(removed);

      const { entity: replacement } = addCircleEntity({ x: 0, y: 0 }, 1);

      world.update();

      expect(replacement).not.toBe(removed);
      expect(collisionPairs).toEqual([
        {
          entityA: Math.min(other, replacement),
          entityB: Math.max(other, replacement),
        },
      ]);
      expect(findBroadPhase(world).proxies.has(removed)).toBe(false);
    });
  });

  describe('unchanged colliders', () => {
    it("should leave an unmoved collider's aabb alone", () => {
      const { collider } = addCircleEntity({ x: 0, y: 0 }, 1);

      world.update();

      const { min, max } = collider.aabb;

      world.update();

      expect(collider.aabb.min).toBe(min);
      expect(collider.aabb.max).toBe(max);
    });

    it('should recompute the aabb when the shape is replaced at the same pose', () => {
      const { collider } = addCircleEntity({ x: 0, y: 0 }, 1);

      world.update();
      collider.collider = new CircleCollider(3);
      world.update();

      expect(collider.aabb.max.x).toBeCloseTo(3);
    });

    it('should recompute the aabb when the collider component is replaced', () => {
      const { entity } = addCircleEntity({ x: 0, y: 0 }, 1);

      world.update();

      const replaced = addColliderComponent(world, entity, {
        collider: new CircleCollider(2),
      });

      world.update();

      expect(replaced.aabb.max.x).toBeCloseTo(2);
    });
  });

  describe('non-finite bounds', () => {
    it('should keep an empty chain out of the trees until it has edges', () => {
      const chain = world.createEntity();

      addPositionComponent(world, chain);
      const collider = addColliderComponent(world, chain, {
        collider: new ChainCollider([]),
      });
      const { entity: body } = addCircleEntity({ x: 0, y: 0 }, 1, 'dynamic');

      world.update();

      expect(collisionPairs).toEqual([]);
      expect(findBroadPhase(world).staticTree.proxyCount).toBe(0);

      collider.collider = new ChainCollider([
        [
          { x: -5, y: -5 },
          { x: 5, y: -5 },
          { x: 5, y: 5 },
          { x: -5, y: 5 },
        ],
      ]);
      world.update();

      expect(collisionPairs).toEqual([{ entityA: chain, entityB: body }]);
    });

    it('should pair a body whose position is NaN with nothing, without throwing', () => {
      const { position } = addCircleEntity({ x: 0, y: 0 }, 1);

      addCircleEntity({ x: 1, y: 0 }, 1);
      world.update();

      position.local = { x: Number.NaN, y: 0 };

      expect(() => world.update()).not.toThrow();
      expect(collisionPairs).toEqual([]);

      position.local = { x: 0, y: 0 };
      world.update();

      expect(collisionPairs).toHaveLength(1);
    });
  });

  describe('order', () => {
    it('should sort pairs by (entityA, entityB) whatever order entities were created or moved in', () => {
      const random = new Random('order');
      const entities: number[] = [];

      for (let i = 0; i < 12; i++) {
        entities.push(
          addCircleEntity({ x: random.randomFloat(0, 4), y: 0 }, 1).entity,
        );
      }

      world.update();

      for (let i = entities.length - 1; i >= 0; i--) {
        world.getComponentRequired<PositionEcsComponent>(
          entities[i],
          positionId,
        ).local = { x: random.randomFloat(0, 4), y: random.randomFloat(0, 1) };
      }

      world.update();

      expect(collisionPairs.length).toBeGreaterThan(0);
      expect(collisionPairs).toEqual(
        [...collisionPairs].sort(
          (a, b) => a.entityA - b.entityA || a.entityB - b.entityB,
        ),
      );

      for (const pair of collisionPairs) {
        expect(pair.entityA).toBeLessThan(pair.entityB);
      }
    });
  });

  describe('statelessness', () => {
    it('should give the brute-force result when the system is removed, the world changes, and it is added back', () => {
      world = new EcsWorld();
      collisionPairs = [];

      const first = createBroadPhaseEcsSystem(collisionPairs);

      createBroadPhase(world);
      world.addSystem(createTransformEcsSystem());
      world.addSystem(first);

      const { position } = addCircleEntity({ x: 0, y: 0 }, 1);
      const { entity: removed } = addCircleEntity({ x: 1, y: 0 }, 1);

      addCircleEntity({ x: 10, y: 0 }, 1);
      world.update();
      world.removeSystem(first);

      position.local = { x: 10, y: 1 };
      world.removeEntity(removed);
      world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
      world.update();

      expect(collisionPairs).toHaveLength(1);
      expect(collisionPairs).toEqual(bruteForcePairs(world));
    });
  });

  describe('compared with testing every pair', () => {
    it.each(['first', 'second', 'third'])(
      'should list the same pairs, in order, over many random ticks (seed %s)',
      (seed) => {
        const random = new Random(seed);
        const broadPhase = findBroadPhase(world);
        const types: (RigidBodyType | null)[] = [
          null,
          'static',
          'kinematic',
          'dynamic',
        ];
        const live: number[] = [];

        const spawn = (): void => {
          const entity = world.createEntity();

          addPositionComponent(world, entity, {
            local: randomPoint(random),
          });
          addRotationComponent(world, entity, {
            local: random.randomFloat(0, Math.PI * 2),
          });
          addColliderComponent(world, entity, {
            collider: randomShape(random),
            category: 1 << random.randomInt(0, 2),
            mask: random.randomInt(1, 7),
          });

          const type = types[random.randomInt(0, types.length - 1)];

          if (type !== null) {
            addRigidBodyComponent(world, entity, { type });
          }

          live.push(entity);
        };

        for (let i = 0; i < 150; i++) {
          spawn();
        }

        for (let tick = 0; tick < 120; tick++) {
          for (const entity of live) {
            mutate(world, random, entity, types);
          }

          if (random.randomInt(0, 3) === 0 && live.length > 0) {
            const index = random.randomInt(0, live.length - 1);

            world.removeEntity(live[index]);
            live.splice(index, 1);
          }

          if (random.randomInt(0, 3) === 0) {
            spawn();
          }

          world.update();

          expect(collisionPairs).toEqual(bruteForcePairs(world));
          broadPhase.staticTree.validate();
          broadPhase.movingTree.validate();
        }
      },
    );
  });
});

const randomPoint = (random: Random): Vector2 => ({
  x: random.randomFloat(0, 40),
  y: random.randomFloat(0, 40),
});

const randomShape = (random: Random): Collider => {
  if (random.randomInt(0, 1) === 0) {
    return new CircleCollider(random.randomFloat(0.2, 2));
  }

  const halfWidth = random.randomFloat(0.2, 2);
  const halfHeight = random.randomFloat(0.2, 2);

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
};

/**
 * Changes one collider entity the way a game might: a small move, a large
 * move, a teleport, a turn, a body type change, a filter change or a new
 * shape, or nothing.
 */
const mutate = (
  world: EcsWorld,
  random: Random,
  entity: number,
  types: readonly (RigidBodyType | null)[],
): void => {
  const position = world.getComponentRequired<PositionEcsComponent>(
    entity,
    positionId,
  );
  const roll = random.randomInt(0, 19);

  if (roll < 6) {
    position.local = {
      x: position.local.x + random.randomFloat(-0.05, 0.05),
      y: position.local.y + random.randomFloat(-0.05, 0.05),
    };
  } else if (roll < 9) {
    position.local = {
      x: position.local.x + random.randomFloat(-2, 2),
      y: position.local.y + random.randomFloat(-2, 2),
    };
  } else if (roll === 9) {
    position.local = randomPoint(random);
  } else if (roll === 10) {
    world.getComponentRequired<RotationEcsComponent>(entity, rotationId).local =
      random.randomFloat(0, Math.PI * 2);
  } else if (roll === 11) {
    const type = types[random.randomInt(0, types.length - 1)];

    if (type === null) {
      world.removeComponent(entity, rigidBodyId);
    } else {
      addRigidBodyComponent(world, entity, { type });
    }
  } else if (roll === 12) {
    world.getComponentRequired<ColliderEcsComponent>(entity, colliderId).mask =
      random.randomInt(0, 7);
  } else if (roll === 13) {
    world.getComponentRequired<ColliderEcsComponent>(
      entity,
      colliderId,
    ).collider = randomShape(random);
  }
};

/**
 * Every pair of colliders with at least one non-static body, whose filters
 * let them collide and whose tight boxes (computed here, independently of
 * the broad phase) overlap, sorted by `(entityA, entityB)`.
 */
const bruteForcePairs = (world: EcsWorld): CollisionPair[] => {
  const {
    entities,
    components: [positions, colliders],
  } = world.query<[PositionEcsComponent, ColliderEcsComponent]>([
    positionId,
    colliderId,
  ]);
  const getRigidBody =
    world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);
  const boxes = entities.map((entity, i) =>
    colliders[i].collider.computeAabb(
      positions[i].world,
      getColliderRotation(getRotation(entity)),
    ),
  );
  const pairs: CollisionPair[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (
        isStaticBody(getRigidBody(entities[i])) &&
        isStaticBody(getRigidBody(entities[j]))
      ) {
        continue;
      }

      if (
        collidersCanCollide(colliders[i], colliders[j]) &&
        aabbsOverlap(boxes[i], boxes[j])
      ) {
        pairs.push({
          entityA: Math.min(entities[i], entities[j]),
          entityB: Math.max(entities[i], entities[j]),
        });
      }
    }
  }

  return pairs.sort((a, b) => a.entityA - b.entityA || a.entityB - b.entityB);
};
