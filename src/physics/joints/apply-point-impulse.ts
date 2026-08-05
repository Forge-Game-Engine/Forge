import { Vec2, Vector2 } from '../../math/index.js';
import { RigidBodyEcsComponent } from '../components/rigidbody-component.js';

/**
 * Applies `impulse` at the point `r` (relative to the body's position) to
 * `rigidBody`'s velocity and angular velocity. A `null` `rigidBody` (static
 * geometry with no `RigidBodyEcsComponent`) is a no-op, so callers can apply
 * the same impulse to both sides of a constraint without checking whether
 * each side is static themselves. Passing `invMass`/`invInertia` of `0` (as
 * `getRigidBodyInverseMass` returns for a `'static'`/`'kinematic'` body) has
 * the same zero-effect even when `rigidBody` is non-`null`, which is how a
 * `'kinematic'` body stays unaffected by contact/joint impulses while still
 * being read as the "other side" of one.
 * @param rigidBody - The rigid body to apply the impulse to, or `null` for
 * static geometry.
 * @param r - The point to apply `impulse` at, relative to `rigidBody`'s
 * position.
 * @param invMass - `rigidBody`'s precomputed inverse mass (`0` if static or
 * kinematic).
 * @param invInertia - `rigidBody`'s precomputed inverse moment of inertia
 * (`0` if static or kinematic).
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
  rigidBody.velocity = Vec2.add(
    rigidBody.velocity,
    Vec2.multiply(Vec2.clone(impulse), invMass),
  );
  rigidBody.angularVelocity += invInertia * Vec2.cross(r, impulse);
}
