import type { Vector2 } from '../math/index.js';
import type { RigidBody } from './rigid-body.js';

/**
 * Calculates the world-space velocity of a point on `body`, accounting for
 * both its linear and angular velocity. Used by collision resolution and
 * joint solving to find the relative velocity between two bodies at a
 * shared point.
 * @param body - The body to calculate the point velocity for.
 * @param contactPoint - The point to calculate the velocity at, relative to
 * the body's center of mass.
 * @returns The world-space velocity of `contactPoint`.
 */
export function velocityAt(body: RigidBody, contactPoint: Vector2): Vector2 {
  return body.velocity.add(
    contactPoint.perpendicular().multiply(-body.angularVelocity),
  );
}
