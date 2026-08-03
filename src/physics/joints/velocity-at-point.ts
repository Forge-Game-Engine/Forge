import {
  createVector2,
  Vector2,
  vector2Add,
  vector2Clone,
  vector2Zero,
} from '../../math/index.js';
import { RigidBodyEcsComponent } from '../components/rigidbody-component.js';

/**
 * The velocity of the point `r` (relative to `rigidBody`'s position) on a
 * rotating, translating body: `velocity + angularVelocity × r`. Bodies with
 * no rigid body (static geometry) have no velocity anywhere.
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
    return vector2Zero();
  }

  // Clone before adding: `rigidBody.velocity` is the body's live velocity
  // state, so sampling a point's velocity must not mutate it.
  return vector2Add(
    vector2Clone(rigidBody.velocity),
    createVector2(
      -rigidBody.angularVelocity * r.y,
      rigidBody.angularVelocity * r.x,
    ),
  );
}
