import { Vec2, Vector2 } from '../../math/index.js';
import { RigidBodyEcsComponent } from '../components/rigidbody-component.js';

/**
 * The velocity of the point `r` (relative to `rigidBody`'s position) on a
 * rotating, translating body: `velocity + angularVelocity × r`. Bodies with
 * no rigid body (static geometry) have no velocity anywhere. A
 * `'kinematic'` body's `velocity`/`angularVelocity` (set directly by game
 * code) is read normally here even though it has `0` inverse mass/inertia
 * in the solver - this is what lets a kinematic body still push a dynamic
 * body it contacts.
 * @param rigidBody - The rigid body, or `null` for static geometry.
 * @param r - The point to sample velocity at, relative to `rigidBody`'s
 * position.
 * @returns The velocity of the point `r`.
 */
export function velocityAtPoint(
  rigidBody: RigidBodyEcsComponent | null,
  r: Vector2,
): Vector2 {
  if (rigidBody === null) {
    return Vec2.zero;
  }

  // Clone before adding: `rigidBody.velocity` is the body's live velocity
  // state, so sampling a point's velocity must not mutate it.
  return Vec2.add(Vec2.clone(rigidBody.velocity), {
    x: -rigidBody.angularVelocity * r.y,
    y: rigidBody.angularVelocity * r.x,
  });
}
