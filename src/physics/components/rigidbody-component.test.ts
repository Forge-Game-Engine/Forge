import { describe, expect, it } from 'vitest';
import { addRigidBodyComponent, rigidBodyId } from './rigidbody-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addRigidBodyComponent', () => {
  it('defaults type to dynamic', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity, { mass: 1, momentOfInertia: 1 });

    const rigidBody = world.getComponent(entity, rigidBodyId)!;

    expect(rigidBody.type).toBe('dynamic');
  });

  it.each(['static', 'kinematic', 'dynamic'] as const)(
    'accepts an explicit type of %s',
    (type) => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      addRigidBodyComponent(world, entity, {
        mass: 1,
        momentOfInertia: 1,
        type,
      });

      const rigidBody = world.getComponent(entity, rigidBodyId)!;

      expect(rigidBody.type).toBe(type);
    },
  );
});
