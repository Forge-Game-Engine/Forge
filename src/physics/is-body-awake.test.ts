import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  rotationId,
} from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { addColliderComponent } from './components/collider-component.js';
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
  });

  function createSleepingBody(): {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
  } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 1, y: 2 } });
    addRotationComponent(world, entity, { local: 0.5 });
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    const rigidBody = addRigidBodyComponent(world, entity, {
      isSleeping: true,
    });

    rigidBody.sleepRecord = {
      position: { x: 1, y: 2 },
      rotation: 0.5,
      links: [],
    };

    return { entity, rigidBody };
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
