import {
  Vector2,
  vector2Add,
  vector2Clone,
  vector2Cross,
  vector2Multiply,
} from '../../math/index.js';
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

  // Clone before multiplying: callers (e.g. joint/contact solvers) commonly
  // apply the same `impulse` object to both sides of a constraint, so this
  // must not mutate it.
  rigidBody.velocity = vector2Add(
    rigidBody.velocity,
    vector2Multiply(vector2Clone(impulse), invMass),
  );
  rigidBody.angularVelocity += invInertia * vector2Cross(r, impulse);
}
