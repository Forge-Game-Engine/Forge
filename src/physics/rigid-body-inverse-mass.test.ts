import { describe, expect, it } from 'vitest';
import { RigidBodyEcsComponent } from './components/index.js';
import { getRigidBodyInverseMass } from './rigid-body-inverse-mass.js';
import { Vec2 } from '../math/index.js';

function createRigidBody(
  type: RigidBodyEcsComponent['type'],
): RigidBodyEcsComponent {
  return {
    mass: 2,
    momentOfInertia: 4,
    velocity: Vec2.zero,
    angularVelocity: 0,
    angularDrag: 0,
    type,
  };
}

describe('getRigidBodyInverseMass', () => {
  it('returns 0/0 for a null rigid body', () => {
    expect(getRigidBodyInverseMass(null)).toEqual({
      invMass: 0,
      invInertia: 0,
    });
  });

  it('returns 1/mass and 1/momentOfInertia for a dynamic body', () => {
    expect(getRigidBodyInverseMass(createRigidBody('dynamic'))).toEqual({
      invMass: 0.5,
      invInertia: 0.25,
    });
  });

  it.each(['static', 'kinematic'] as const)(
    'returns 0/0 for a %s body',
    (type) => {
      expect(getRigidBodyInverseMass(createRigidBody(type))).toEqual({
        invMass: 0,
        invInertia: 0,
      });
    },
  );
});
