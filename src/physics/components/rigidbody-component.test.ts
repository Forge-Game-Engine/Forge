import { describe, expect, it } from 'vitest';
import { addRigidBodyComponent, rigidBodyId } from './rigidbody-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addRigidBodyComponent', () => {
  it('defaults type to dynamic', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity);

    const rigidBody = world.getComponent(entity, rigidBodyId)!;

    expect(rigidBody.type).toBe('dynamic');
  });

  it.each(['static', 'kinematic', 'dynamic'] as const)(
    'accepts an explicit type of %s',
    (type) => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      addRigidBodyComponent(world, entity, {
        type,
      });

      const rigidBody = world.getComponent(entity, rigidBodyId)!;

      expect(rigidBody.type).toBe(type);
    },
  );

  it('starts awake, able to sleep, with no rest time or sleep record', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const rigidBody = addRigidBodyComponent(world, entity);

    expect(rigidBody.canSleep).toBe(true);
    expect(rigidBody.isSleeping).toBe(false);
    expect(rigidBody.wakeRequested).toBe(false);
    expect(rigidBody.restTime).toBe(0);
    expect(rigidBody.sleepRecord).toBeNull();
  });

  it('creates a dynamic body asleep', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const rigidBody = addRigidBodyComponent(world, entity, {
      isSleeping: true,
    });

    expect(rigidBody.isSleeping).toBe(true);
    expect(rigidBody.sleepRecord).toBeNull();
  });

  it.each(['static', 'kinematic'] as const)(
    'throws for a sleeping %s body',
    (type) => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      expect(() =>
        addRigidBodyComponent(world, entity, { type, isSleeping: true }),
      ).toThrow(/only dynamic bodies sleep/);
    },
  );

  it('throws for a sleeping body that cannot sleep', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addRigidBodyComponent(world, entity, {
        isSleeping: true,
        canSleep: false,
      }),
    ).toThrow(/canSleep is false/);
  });
});
