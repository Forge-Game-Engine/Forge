import { describe, expect, it } from 'vitest';
import { applyImpulse } from './apply-impluse.js';
import { RigidBodyEcsComponent } from './components/index.js';
import { Vec2 } from '../math/index.js';

describe('applyImpulse', () => {
  it('changes velocity by impulse * (1 / mass) for a dynamic body', () => {
    const rigidBody: RigidBodyEcsComponent = {
      mass: 2,
      momentOfInertia: 1,
      velocity: Vec2.zero,
      angularVelocity: 0,
      angularDrag: 0,
      type: 'dynamic',
    };

    applyImpulse({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, rigidBody);

    expect(rigidBody.velocity).toEqual({ x: 5, y: 0 });
  });

  it('imparts spin when the impulse is applied off-center', () => {
    const rigidBody: RigidBodyEcsComponent = {
      mass: 1,
      momentOfInertia: 1,
      velocity: Vec2.zero,
      angularVelocity: 0,
      angularDrag: 0,
      type: 'dynamic',
    };

    applyImpulse({ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0 }, rigidBody);

    expect(rigidBody.angularVelocity).not.toBe(0);
  });

  it.each(['static', 'kinematic'] as const)(
    'does not change velocity or angularVelocity for a %s body',
    (type) => {
      const rigidBody: RigidBodyEcsComponent = {
        mass: 1,
        momentOfInertia: 1,
        velocity: Vec2.zero,
        angularVelocity: 0,
        angularDrag: 0,
        type,
      };

      applyImpulse({ x: 10, y: 5 }, { x: 1, y: 1 }, { x: 0, y: 0 }, rigidBody);

      expect(rigidBody.velocity).toEqual({ x: 0, y: 0 });
      expect(rigidBody.angularVelocity).toBe(0);
    },
  );
});
