import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import {
  addColliderComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  addContactsComponent,
  ContactsEcsComponent,
} from '../components/contacts-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

describe('createNarrowPhaseEcsSystem contacts and sensors', () => {
  let world: EcsWorld;
  let collisionPairs: CollisionPair[];
  let collisionManifolds: CollisionManifold[];

  beforeEach(() => {
    world = new EcsWorld();
    collisionPairs = [];
    collisionManifolds = [];

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
  });

  function addCircle(
    position: Vector2,
    options: { sensor?: boolean; contacts?: boolean } = {},
  ): { entity: number; contacts: ContactsEcsComponent | null } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addColliderComponent(world, entity, {
      collider: new CircleCollider(1),
      sensor: options.sensor ?? false,
    });

    const contacts = options.contacts
      ? addContactsComponent(world, entity)
      : null;

    return { entity, contacts };
  }

  function moveTo(entity: number, position: Vector2): void {
    world.getComponentRequired<PositionEcsComponent>(entity, positionId).local =
      position;
  }

  describe('contacts', () => {
    it('should report a contact as started and touching on the first overlapping tick', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();

      expect(contacts?.touching).toEqual([other]);
      expect(contacts?.started).toEqual([other]);
      expect(contacts?.ended).toEqual([]);
    });

    it('should keep a contact touching, but not started, while the overlap lasts', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();
      world.update();

      expect(contacts?.touching).toEqual([other]);
      expect(contacts?.started).toEqual([]);
      expect(contacts?.ended).toEqual([]);
    });

    it('should report a contact as ended on the first separated tick', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();
      moveTo(other, { x: 10, y: 0 });
      world.update();

      expect(contacts?.touching).toEqual([]);
      expect(contacts?.started).toEqual([]);
      expect(contacts?.ended).toEqual([other]);

      world.update();

      expect(contacts?.ended).toEqual([]);
    });

    it('should not report a pair whose AABBs overlap but shapes do not', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });

      // Diagonal neighbors: the square AABBs overlap at a corner, the
      // circles don't.
      addCircle({ x: 1.9, y: 1.9 });

      world.update();

      expect(collisionPairs).toHaveLength(1);
      expect(contacts?.touching).toEqual([]);
    });

    it('should fill contacts on both entities of a pair that has them', () => {
      const { entity: a, contacts: contactsA } = addCircle(
        { x: 0, y: 0 },
        { contacts: true },
      );
      const { entity: b, contacts: contactsB } = addCircle(
        { x: 1, y: 0 },
        { contacts: true },
      );

      world.update();

      expect(contactsA?.touching).toEqual([b]);
      expect(contactsB?.touching).toEqual([a]);
    });

    it('should list an entity once even when the pair produces several manifolds', () => {
      const ground = world.createEntity();

      addPositionComponent(world, ground);
      addColliderComponent(world, ground, {
        collider: new TerrainCollider(
          [
            { x: -10, y: 10 },
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          5,
        ),
      });

      // Sits in the valley, touching both of its edges.
      const { contacts } = addCircle({ x: 0, y: 1 }, { contacts: true });

      world.update();

      expect(collisionManifolds.length).toBeGreaterThan(1);
      expect(contacts?.touching).toEqual([ground]);
    });

    it('should end a contact when the other entity is removed', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();
      world.removeEntity(other);
      world.update();

      expect(contacts?.touching).toEqual([]);
      expect(contacts?.ended).toEqual([other]);
      expect(world.isAlive(other)).toBe(false);
    });

    it('should tell a removed entity apart from a new one that reuses its slot', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: removed } = addCircle({ x: 1, y: 0 });

      world.update();
      world.removeEntity(removed);

      const { entity: replacement } = addCircle({ x: 1, y: 0 });

      world.update();

      expect(replacement).not.toBe(removed);
      expect(contacts?.touching).toEqual([replacement]);
      expect(contacts?.started).toEqual([replacement]);
      expect(contacts?.ended).toEqual([removed]);
    });

    it('should end a contact when the other entity loses its collider', () => {
      const { contacts } = addCircle({ x: 0, y: 0 }, { contacts: true });
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();
      world.removeComponent(other, colliderId);
      world.update();

      expect(contacts?.touching).toEqual([]);
      expect(contacts?.ended).toEqual([other]);
    });

    it('should end every contact when its own entity loses its collider', () => {
      const { entity, contacts } = addCircle(
        { x: 0, y: 0 },
        { contacts: true },
      );
      const { entity: other } = addCircle({ x: 1, y: 0 });

      world.update();
      world.removeComponent(entity, colliderId);
      world.update();

      expect(contacts?.touching).toEqual([]);
      expect(contacts?.ended).toEqual([other]);
    });

    it('should not report pairs that collision filtering excludes', () => {
      const entity = world.createEntity();

      addPositionComponent(world, entity);
      addColliderComponent(world, entity, {
        collider: new CircleCollider(1),
        category: 0b01,
        mask: 0b01,
      });

      const contacts = addContactsComponent(world, entity);
      const other = world.createEntity();

      addPositionComponent(world, other, { local: { x: 1, y: 0 } });
      addColliderComponent(world, other, {
        collider: new CircleCollider(1),
        category: 0b10,
      });

      world.update();

      expect(contacts.touching).toEqual([]);
    });
  });

  describe('sensors', () => {
    it('should report a sensor overlap through contacts but never as a manifold', () => {
      const { entity: sensor, contacts: sensorContacts } = addCircle(
        { x: 0, y: 0 },
        { sensor: true, contacts: true },
      );
      const { entity: body, contacts: bodyContacts } = addCircle(
        { x: 1, y: 0 },
        { contacts: true },
      );

      world.update();

      expect(collisionManifolds).toHaveLength(0);
      expect(sensorContacts?.touching).toEqual([body]);
      expect(bodyContacts?.touching).toEqual([sensor]);
    });

    it('should report a sensor overlapping a static collider', () => {
      const { contacts } = addCircle(
        { x: 0, y: 0 },
        { sensor: true, contacts: true },
      );
      const wall = world.createEntity();

      addPositionComponent(world, wall, { local: { x: 1, y: 0 } });
      addColliderComponent(world, wall, { collider: new CircleCollider(1) });

      world.update();

      expect(collisionManifolds).toHaveLength(0);
      expect(contacts?.touching).toEqual([wall]);
    });

    it('should report two overlapping sensors to each other', () => {
      const { entity: a, contacts } = addCircle(
        { x: 0, y: 0 },
        { sensor: true, contacts: true },
      );
      const { entity: b } = addCircle({ x: 1, y: 0 }, { sensor: true });

      world.update();

      expect(collisionManifolds).toHaveLength(0);
      expect(contacts?.touching).toEqual([b]);
      expect(a).not.toBe(b);
    });

    it('should still produce manifolds for solid pairs alongside a sensor', () => {
      addCircle({ x: 0, y: 0 }, { sensor: true });
      addCircle({ x: 1, y: 0 });
      addCircle({ x: 1.5, y: 0 });

      world.update();

      expect(collisionManifolds).toHaveLength(1);
    });

    it('should never push a dynamic body that overlaps it', () => {
      const time = new Time();

      time.update(0);
      world.addSystem(
        createCollisionResolutionEcsSystem(
          collisionManifolds,
          [] as ContactConstraint[],
          time,
        ),
      );
      world.addSystem(createEulerIntegrationEcsSystem(time));

      addCircle({ x: 0, y: 0 }, { sensor: true });

      const { entity: body } = addCircle({ x: 0.5, y: 0 });
      const collider = new CircleCollider(1);

      addRigidBodyComponent(world, body, {
        mass: collider.mass,
        momentOfInertia: collider.momentOfInertia,
      });

      for (let i = 0; i < 10; i++) {
        time.update(i * 16);
        world.update();
      }

      expect(
        world.getComponentRequired<PositionEcsComponent>(body, positionId)
          .local,
      ).toEqual({ x: 0.5, y: 0 });
    });
  });
});
