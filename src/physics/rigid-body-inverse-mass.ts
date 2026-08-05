import { RigidBodyEcsComponent } from './components/rigidbody-component.js';

/**
 * A rigid body's inverse mass/inertia, as the contact and joint solvers use
 * them.
 */
export interface RigidBodyInverseMass {
  invMass: number;
  invInertia: number;
}

/**
 * Resolves the inverse mass/inertia the solver should use for `rigidBody`:
 * `1 / mass` and `1 / momentOfInertia` for a `'dynamic'` body, or `0`/`0`
 * (infinite effective mass) for a `'static'`/`'kinematic'` body or a `null`
 * `rigidBody` (an entity with no `RigidBodyEcsComponent`, the static
 * convention every collider-only entity follows). `0` inverse mass/inertia
 * is what makes `applyPointImpulse` a no-op for these bodies, so they're
 * never moved by a collision or joint impulse - but their (possibly
 * user-set) `velocity` is still read by `velocityAtPoint`, which is what
 * lets a kinematic body still push a dynamic body it contacts.
 * @param rigidBody - The rigid body to resolve, or `null` for static
 * geometry with no `RigidBodyEcsComponent`.
 * @returns The resolved `invMass`/`invInertia`.
 */
export function getRigidBodyInverseMass(
  rigidBody: RigidBodyEcsComponent | null,
): RigidBodyInverseMass {
  if (rigidBody === null || rigidBody.type !== 'dynamic') {
    return { invMass: 0, invInertia: 0 };
  }

  return {
    invMass: 1 / rigidBody.mass,
    invInertia: 1 / rigidBody.momentOfInertia,
  };
}
