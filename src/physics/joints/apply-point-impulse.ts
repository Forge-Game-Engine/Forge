import { Vector2 } from '../../math/index.js';
import { RigidBodyEcsComponent } from '../components/rigidbody-component.js';

/**
 * Applies `impulse` at the point `r` (relative to the body's position) to
 * `rigidBody`'s velocity and angular velocity. A `null` `rigidBody` (static
 * geometry) is a no-op, so callers can apply the same impulse to both sides
 * of a constraint without checking whether each side is static themselves.
 * @param rigidBody - The rigid body to apply the impulse to, or `null` for
 * static geometry.
 * @param r - The point to apply `impulse` at, relative to `rigidBody`'s
 * position.
 * @param invMass - `rigidBody`'s precomputed inverse mass (`0` if static).
 * @param invInertia - `rigidBody`'s precomputed inverse moment of inertia
 * (`0` if static).
 * @param impulse - The impulse to apply.
 */
export function applyPointImpulse(
  rigidBody: RigidBodyEcsComponent | null,
  r: Vector2,
  invMass: number,
  invInertia: number,
  impulse: Vector2,
): void {
  if (rigidBody === null) {
    return;
  }

  rigidBody.velocity = rigidBody.velocity.add(impulse.multiply(invMass));
  rigidBody.angularVelocity += invInertia * r.cross(impulse);
}
