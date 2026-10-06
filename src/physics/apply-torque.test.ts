import { beforeEach, describe, expect, it } from 'vitest';
import { applyTorque } from './apply-torque.js';
import { EcsWorld } from '../ecs/index.js';
import { CircleCollider } from './colliders/index.js';
import {
  addColliderComponent,
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  RigidBodyType,
} from './components/index.js';

describe('applyTorque', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(
    type: RigidBodyType,
    angularVelocity: number = 0,
  ): { entity: number; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();

    // A circle with a moment of inertia of 2 (mass 2, radius sqrt(2)).
    addColliderComponent(world, entity, {
      collider: new CircleCollider(Math.SQRT2, 1 / Math.PI),
    });

    return {
      entity,
      rigidBody: addRigidBodyComponent(world, entity, {
        type,
        angularVelocity,
      }),
    };
  }

  it('should change angularVelocity by torque * deltaTime / momentOfInertia', () => {
    const { entity, rigidBody } = createBody('dynamic');

    applyTorque(world, entity, 4, 0.5);

    expect(rigidBody.angularVelocity).toBeCloseTo(1);
  });

  it('should accumulate onto an existing angularVelocity', () => {
    const { entity, rigidBody } = createBody('dynamic', 2);

    applyTorque(world, entity, -2, 1);

    expect(rigidBody.angularVelocity).toBeCloseTo(1);
  });

  it.each(['static', 'kinematic'] as const)(
    'should not change angularVelocity for a %s body',
    (type) => {
      const { entity, rigidBody } = createBody(type);

      applyTorque(world, entity, 4, 0.5);

      expect(rigidBody.angularVelocity).toBe(0);
    },
  );

  it('should do nothing for an entity with no rigid body', () => {
    const entity = world.createEntity();

    expect(() => applyTorque(world, entity, 4, 0.5)).not.toThrow();
  });
});
