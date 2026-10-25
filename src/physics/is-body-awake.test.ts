import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  positionId,
  rotationId,
} from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import {
  addColliderComponent,
  colliderId,
} from './components/collider-component.js';
import {
  addGravityComponent,
  gravityId,
} from './components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  RigidBodyOptions,
} from './components/rigidbody-component.js';
import { CircleCollider } from './colliders/circle-collider.js';
import { isBodyAwake, isContactAsleep } from './is-body-awake.js';

describe('isBodyAwake', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    // Game code moves a partner by writing `local`; the transform system
    // composes the `world` pose a sleeping body compares with its record.
    world.addSystem(createTransformEcsSystem());
  });

  function createSleepingBody(): {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
    floor: number;
  } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 1, y: 2 } });
    addRotationComponent(world, entity, { local: 0.5 });

    const { collider } = addColliderComponent(world, entity, {
      collider: new CircleCollider(1),
    });
    const gravity = addGravityComponent(world, entity, {
      amount: { x: 0, y: 10 },
    });

    const rigidBody = addRigidBodyComponent(world, entity, {
      isSleeping: true,
    });

    const floor = world.createEntity();

    addPositionComponent(world, floor, { local: { x: 1, y: 4 } });
    addRotationComponent(world, floor, { local: 0.25 });

    const { collider: floorCollider } = addColliderComponent(world, floor, {
      collider: new CircleCollider(1),
    });

    rigidBody.sleepRecord = {
      position: { x: 1, y: 2 },
      rotation: 0.5,
      collider,
      gravity: { x: gravity.amount.x, y: gravity.amount.y },
      partners: [
        {
          entity: floor,
          position: { x: 1, y: 4 },
          rotation: 0.25,
          collider: floorCollider,
        },
      ],
      links: [floor],
      manifolds: [],
    };

    return { entity, rigidBody, floor };
  }

  it('is false for an entity with no rigid body', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(isBodyAwake(world, entity)).toBe(false);
  });

  it('is false for a static body', () => {
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity, {
      type: 'static',
      velocity: { x: 1, y: 0 },
    });

    expect(isBodyAwake(world, entity)).toBe(false);
  });

  it('is false for a still kinematic body', () => {
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity, { type: 'kinematic' });

    expect(isBodyAwake(world, entity)).toBe(false);
  });

  it.each([
    ['velocity', { velocity: { x: 0, y: -1 } }],
    ['angular velocity', { angularVelocity: 0.1 }],
  ])('is true for a kinematic body with a %s', (_name, options) => {
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity, { type: 'kinematic', ...options });

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('is true for a dynamic body that is not sleeping', () => {
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity);

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('is false for an undisturbed sleeping body', () => {
    const { entity } = createSleepingBody();

    expect(isBodyAwake(world, entity)).toBe(false);
  });

  it.each<[string, (rigidBody: RigidBodyEcsComponent) => void]>([
    ['a velocity', (rigidBody) => (rigidBody.velocity.y = 0.001)],
    ['an angular velocity', (rigidBody) => (rigidBody.angularVelocity = -1)],
    ['canSleep set to false', (rigidBody) => (rigidBody.canSleep = false)],
    ['a wake request', (rigidBody) => (rigidBody.wakeRequested = true)],
  ])('is true for a sleeping body given %s', (_name, disturb) => {
    const { entity, rigidBody } = createSleepingBody();

    disturb(rigidBody);

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('is true for a sleeping body moved by a tiny distance', () => {
    const { entity } = createSleepingBody();

    world.getComponent(entity, positionId)!.local.x += 1e-9;

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('is true for a sleeping body turned away from its recorded rotation', () => {
    const { entity } = createSleepingBody();

    world.getComponent(entity, rotationId)!.local = 0.6;

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it.each<[string, (entity: number) => void]>([
    [
      'given a new collider object',
      (entity): void => {
        world.getComponent(entity, colliderId)!.collider = new CircleCollider(
          1,
        );
      },
    ],
    [
      'that lost its collider',
      (entity): void => world.removeComponent(entity, colliderId),
    ],
    [
      'whose gravity changed',
      (entity): void => {
        world.getComponent(entity, gravityId)!.amount.y = -10;
      },
    ],
    [
      'whose gravity was removed',
      (entity): void => world.removeComponent(entity, gravityId),
    ],
  ])('is true for a sleeping body %s', (_name, change) => {
    const { entity } = createSleepingBody();

    change(entity);

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('is true for a sleeping body given gravity it fell asleep without', () => {
    const { entity, rigidBody } = createSleepingBody();

    world.removeComponent(entity, gravityId);
    rigidBody.sleepRecord = { ...rigidBody.sleepRecord!, gravity: null };

    expect(isBodyAwake(world, entity)).toBe(false);

    addGravityComponent(world, entity);

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it.each<[string, (floor: number) => void]>([
    [
      'was removed',
      (floor): void => {
        world.removeEntity(floor);
      },
    ],
    [
      'lost its collider',
      (floor): void => world.removeComponent(floor, colliderId),
    ],
    [
      'got a new collider object',
      (floor): void => {
        world.getComponent(floor, colliderId)!.collider = new CircleCollider(1);
      },
    ],
    [
      'moved',
      (floor): void => {
        world.getComponent(floor, positionId)!.local.y += 0.5;
        world.update();
      },
    ],
    [
      'turned',
      (floor): void => {
        world.getComponent(floor, rotationId)!.local = 0;
        world.update();
      },
    ],
    [
      'lost its rotation',
      (floor): void => world.removeComponent(floor, rotationId),
    ],
  ])('is true for a sleeping body whose partner %s', (_name, change) => {
    const { entity, floor } = createSleepingBody();

    change(floor);

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('wakes a sleeping body only once the transform system composes its partner’s new local position', () => {
    const { entity, floor } = createSleepingBody();

    // Collision reads `world`, so a `local` the transform system hasn't
    // composed yet changes nothing the body rests on.
    world.getComponent(floor, positionId)!.local.y += 0.5;

    expect(isBodyAwake(world, entity)).toBe(false);

    world.update();

    expect(isBodyAwake(world, entity)).toBe(true);
  });

  it('compares a sleeping body with no record on its velocity, canSleep and wake request only', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 5, y: 5 } });

    const rigidBody = addRigidBodyComponent(world, entity, {
      isSleeping: true,
    });

    expect(isBodyAwake(world, entity)).toBe(false);

    rigidBody.wakeRequested = true;

    expect(isBodyAwake(world, entity)).toBe(true);
  });
});

describe('isContactAsleep', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(options: RigidBodyOptions): {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
  } {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);

    return { entity, rigidBody: addRigidBodyComponent(world, entity, options) };
  }

  function createColliderOnly(): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    return entity;
  }

  it('is true for two sleeping bodies', () => {
    const a = createBody({ isSleeping: true });
    const b = createBody({ isSleeping: true });

    expect(isContactAsleep(world, a.entity, b.entity)).toBe(true);
  });

  it.each<[string, () => number]>([
    ['a collider-only entity', createColliderOnly],
    ['a static body', () => createBody({ type: 'static' }).entity],
    ['a still kinematic body', () => createBody({ type: 'kinematic' }).entity],
  ])('is true for a sleeping body and %s, in either order', (_, create) => {
    const body = createBody({ isSleeping: true });
    const other = create();

    expect(isContactAsleep(world, body.entity, other)).toBe(true);
    expect(isContactAsleep(world, other, body.entity)).toBe(true);
  });

  it('is false when one side is an awake dynamic body', () => {
    const body = createBody({ isSleeping: true });
    const awake = createBody({});

    expect(isContactAsleep(world, body.entity, awake.entity)).toBe(false);
  });

  it('is false when the sleeping body was disturbed', () => {
    const body = createBody({ isSleeping: true });
    const floor = createColliderOnly();

    body.rigidBody.velocity.x = 1;

    expect(isContactAsleep(world, body.entity, floor)).toBe(false);
  });

  it('is false for a sleeping body and a moving kinematic body', () => {
    const body = createBody({ isSleeping: true });
    const platform = createBody({
      type: 'kinematic',
      velocity: { x: 1, y: 0 },
    });

    expect(isContactAsleep(world, body.entity, platform.entity)).toBe(false);
  });

  it('is false when neither side is a sleeping body', () => {
    const floor = createColliderOnly();
    const wall = createBody({ type: 'static' });

    expect(isContactAsleep(world, floor, wall.entity)).toBe(false);
  });
});
