import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { detectCollision } from '../collision/detect-collision.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
} from '../components/collider-component.js';
import {
  addContactsComponent,
  ContactsEcsComponent,
} from '../components/contacts-component.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';
import { createSleepEcsSystem } from './sleep-system.js';

vi.mock('../collision/detect-collision.js', { spy: true });

const detectCollisionSpy = vi.mocked(detectCollision);

function boxCollider(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

describe('createNarrowPhaseEcsSystem with sleeping bodies', () => {
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
    // Records the manifolds of bodies created asleep on the first tick, for
    // the narrow phase to reuse on the next.
    world.addSystem(createSleepEcsSystem(collisionManifolds, new Time()));
  });

  interface TestCircle {
    entity: number;
    collider: ColliderEcsComponent;
    contacts: ContactsEcsComponent;
  }

  function addCircle(
    position: Vector2,
    options: { sensor?: boolean } = {},
  ): TestCircle {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity);

    const collider = addColliderComponent(world, entity, {
      collider: new CircleCollider(1),
      sensor: options.sensor ?? false,
    });
    const contacts = addContactsComponent(world, entity);

    return { entity, collider, contacts };
  }

  function addSleepingCircle(
    position: Vector2,
  ): TestCircle & { rigidBody: RigidBodyEcsComponent } {
    const circle = addCircle(position);
    const rigidBody = addRigidBodyComponent(world, circle.entity, {
      isSleeping: true,
    });

    return { ...circle, rigidBody };
  }

  function tickPair(entityA: number, entityB: number): void {
    collisionPairs.length = 0;
    collisionPairs.push({ entityA, entityB });
    detectCollisionSpy.mockClear();
    world.update();
  }

  it('reuses the manifolds of a sleeping body resting on a static collider without testing the pair', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
    expect(collisionManifolds).toHaveLength(1);

    const [manifold] = collisionManifolds;

    expect(manifold.colliderA).toBe(body.collider.collider);
    expect(manifold.colliderB).toBe(floor.collider.collider);
    expect(body.rigidBody.sleepRecord?.manifolds).toEqual([manifold]);

    for (let i = 0; i < 3; i++) {
      tickPair(body.entity, floor.entity);

      expect(detectCollisionSpy).not.toHaveBeenCalled();
      expect(collisionManifolds).toEqual([manifold]);
      expect(collisionManifolds[0]).toBe(manifold);
      expect(body.contacts.touching).toEqual([floor.entity]);
      expect(body.contacts.started).toEqual([]);
      expect(body.contacts.ended).toEqual([]);
      expect(floor.contacts.touching).toEqual([body.entity]);
      expect(floor.contacts.started).toEqual([]);
      expect(floor.contacts.ended).toEqual([]);
    }
  });

  it('reads the manifolds to reuse from the sleep record, not from its previous output', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);
    collisionManifolds.length = 0;
    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).not.toHaveBeenCalled();
    expect(collisionManifolds).toHaveLength(1);
  });

  it('tests a sleeping body with no sleep record yet', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);
    body.rigidBody.sleepRecord = null;
    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
  });

  it('reuses the manifolds of two sleeping bodies resting on each other', () => {
    const bodyA = addSleepingCircle({ x: 0, y: 0 });
    const bodyB = addSleepingCircle({ x: 0, y: 1.5 });

    tickPair(bodyA.entity, bodyB.entity);
    tickPair(bodyA.entity, bodyB.entity);

    expect(detectCollisionSpy).not.toHaveBeenCalled();
    expect(collisionManifolds).toHaveLength(1);
  });

  it('tests a pair of a sleeping body and an awake dynamic body every tick', () => {
    const body = addSleepingCircle({ x: 0, y: 0 });
    const other = addCircle({ x: 0, y: 1.5 });

    addRigidBodyComponent(world, other.entity);

    tickPair(body.entity, other.entity);
    tickPair(body.entity, other.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
    expect(collisionManifolds).toHaveLength(1);
  });

  it('tests the pairs of a sleeping body that was disturbed', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);
    body.rigidBody.velocity.x = 1;
    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
  });

  it('tests a sleeping pair that had no manifolds last tick, so a new contact is found', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    world.update();

    expect(collisionManifolds).toHaveLength(0);

    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
    expect(collisionManifolds).toHaveLength(1);
    expect(body.contacts.started).toEqual([floor.entity]);
  });

  it('tests a pair of two collider-only entities every tick', () => {
    const a = addCircle({ x: 0, y: 0 });
    const b = addCircle({ x: 0, y: 1.5 });

    tickPair(a.entity, b.entity);
    tickPair(a.entity, b.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
  });

  it('tests a sensor pair every tick and keeps it in the touching list of a sleeping body', () => {
    const zone = addCircle({ x: 0, y: 0 }, { sensor: true });
    const body = addSleepingCircle({ x: 0, y: 0.5 });

    tickPair(body.entity, zone.entity);

    for (let i = 0; i < 3; i++) {
      tickPair(body.entity, zone.entity);

      expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
      expect(collisionManifolds).toHaveLength(0);
      expect(body.contacts.touching).toEqual([zone.entity]);
      expect(body.contacts.started).toEqual([]);
      expect(body.contacts.ended).toEqual([]);
    }
  });

  it('tests a sleeping pair again when a collider was replaced, and ends the contact if the new shape misses', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);

    // A smaller circle with the same center no longer reaches the body.
    floor.collider.collider = new CircleCollider(0.25);
    tickPair(body.entity, floor.entity);

    expect(detectCollisionSpy).toHaveBeenCalledTimes(1);
    expect(collisionManifolds).toHaveLength(0);
    expect(body.contacts.touching).toEqual([]);
    expect(body.contacts.ended).toEqual([floor.entity]);
  });

  it('ends the contact with a removed partner and drops its manifolds', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);
    world.removeEntity(floor.entity);
    tickPair(body.entity, floor.entity);

    expect(collisionManifolds).toHaveLength(0);
    expect(body.contacts.touching).toEqual([]);
    expect(body.contacts.ended).toEqual([floor.entity]);
  });

  it('drops the manifolds of a sleeping pair once the broad phase stops listing it', () => {
    const floor = addCircle({ x: 0, y: 1.5 });
    const body = addSleepingCircle({ x: 0, y: 0 });

    tickPair(body.entity, floor.entity);
    collisionPairs.length = 0;
    world.update();

    expect(collisionManifolds).toHaveLength(0);
    expect(body.contacts.ended).toEqual([floor.entity]);
  });
});

describe('collision detection in a sleeping pile', () => {
  const fixedDeltaMilliseconds = 1000 / 60;
  const ticksPerSecond = 60;

  let world: EcsWorld;
  let time: Time;
  let collisionPairs: CollisionPair[];
  let collisionManifolds: CollisionManifold[];
  let contactConstraints: ContactConstraint[];
  let floor: number;
  let floorCollider: ColliderEcsComponent;

  interface Box {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
    position: PositionEcsComponent;
    contacts: ContactsEcsComponent;
  }

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    collisionPairs = [];
    collisionManifolds = [];
    contactConstraints = [];

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
    world.addSystem(createSleepEcsSystem(collisionManifolds, time));
    world.addSystem(createGravityEcsSystem(time));
    world.addSystem(
      createCollisionResolutionEcsSystem(
        collisionManifolds,
        contactConstraints,
        time,
      ),
    );
    world.addSystem(createEulerIntegrationEcsSystem(time));

    // A static floor whose top face is at `y = 0` (`+Y` is down).
    floor = world.createEntity();
    addPositionComponent(world, floor, { local: { x: 0, y: 5 } });
    addRotationComponent(world, floor);
    floorCollider = addColliderComponent(world, floor, {
      collider: boxCollider(40, 10),
      restitution: 0,
    });
  });

  function addBox(center: Vector2): Box {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, { local: center });

    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: boxCollider(1, 1),
      restitution: 0,
    });
    addGravityComponent(world, entity);

    const rigidBody = addRigidBodyComponent(world, entity);
    const contacts = addContactsComponent(world, entity);

    return { entity, rigidBody, position, contacts };
  }

  function addPyramid(): Box[] {
    const boxes: Box[] = [];

    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4 - row; column++) {
        boxes.push(
          addBox({ x: column * 1.1 + row * 0.55, y: -0.55 - row * 1.05 }),
        );
      }
    }

    return boxes;
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  function tickUntilAsleep(boxes: Box[]): void {
    for (let i = 0; i < 3 * ticksPerSecond; i++) {
      tick();

      if (boxes.every((box) => box.rigidBody.isSleeping)) {
        return;
      }
    }

    throw new Error('The boxes did not fall asleep.');
  }

  it('runs no collision tests for a sleeping pyramid, and keeps every contact and its impulses', () => {
    const boxes = addPyramid();

    tickUntilAsleep(boxes);

    const touching = boxes.map((box) => box.contacts.touching);
    const manifolds = [...collisionManifolds];
    const constraints = [...contactConstraints];
    const impulses = constraints.map((c) => c.accumulatedNormalImpulse);

    expect(manifolds.length).toBeGreaterThan(0);
    expect(impulses.some((impulse) => impulse > 0)).toBe(true);

    detectCollisionSpy.mockClear();

    for (let i = 0; i < ticksPerSecond; i++) {
      tick();
    }

    expect(detectCollisionSpy).not.toHaveBeenCalled();
    expect(boxes.every((box) => box.rigidBody.isSleeping)).toBe(true);
    expect(collisionManifolds).toEqual(manifolds);
    expect(contactConstraints).toEqual(constraints);
    expect(contactConstraints.map((c) => c.accumulatedNormalImpulse)).toEqual(
      impulses,
    );

    for (const [i, box] of boxes.entries()) {
      expect(box.contacts.touching).toEqual(touching[i]);
      expect(box.contacts.started).toEqual([]);
      expect(box.contacts.ended).toEqual([]);
    }
  });

  it('warm-starts every contact of the pyramid on the tick it wakes', () => {
    const boxes = addPyramid();

    tickUntilAsleep(boxes);

    for (let i = 0; i < 10; i++) {
      tick();
    }

    const constraints = new Set(contactConstraints);

    boxes[0].rigidBody.wakeRequested = true;
    tick();

    expect(boxes.every((box) => !box.rigidBody.isSleeping)).toBe(true);
    expect(contactConstraints).toHaveLength(constraints.size);

    for (const constraint of contactConstraints) {
      // The same constraint objects, so the impulses they fell asleep with
      // were warm-started.
      expect(constraints.has(constraint)).toBe(true);
      expect(constraint.isReused).toBe(true);
    }
  });

  it('wakes a box asleep on a static collider whose shape is replaced by one that no longer holds it up', () => {
    const box = addBox({ x: 0, y: -0.55 });

    tickUntilAsleep([box]);

    const restingY = box.position.local.y;

    // A wedge whose bounds still overlap the box, but whose top edge is
    // well below it (the floor entity is at `y = 5`).
    floorCollider.collider = new PolygonCollider([
      { x: -20, y: -6 },
      { x: 20, y: 4 },
      { x: -20, y: 4 },
    ]);
    tick();

    expect(collisionPairs).toContainEqual({
      entityA: floor,
      entityB: box.entity,
    });
    expect(box.rigidBody.isSleeping).toBe(false);
    expect(box.contacts.ended).toEqual([floor]);

    for (let i = 0; i < 10; i++) {
      tick();
    }

    expect(box.position.local.y).toBeGreaterThan(restingY);
  });
});
