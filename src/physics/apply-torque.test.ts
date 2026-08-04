import { describe, expect, it } from 'vitest';
import { applyTorque } from './apply-torque.js';
import { RigidBodyEcsComponent } from './components/index.js';
import { Vec2 } from '../math/index.js';

describe('applyTorque', () => {
  it('should change angularVelocity by torque * deltaTime / momentOfInertia', () => {
    const rigidBody: RigidBodyEcsComponent = {
      mass: 1,
      momentOfInertia: 2,
      velocity: Vec2.zero,
      angularVelocity: 0,
      angularDrag: 0,
    };

    applyTorque(4, 0.5, rigidBody);

    expect(rigidBody.angularVelocity).toBeCloseTo(1);
  });

  it('should accumulate onto an existing angularVelocity', () => {
    const rigidBody: RigidBodyEcsComponent = {
      mass: 1,
      momentOfInertia: 1,
      velocity: Vec2.zero,
      angularVelocity: 2,
      angularDrag: 0,
    };

    applyTorque(-1, 1, rigidBody);

    expect(rigidBody.angularVelocity).toBeCloseTo(1);
  });
});
