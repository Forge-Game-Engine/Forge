import { Vec2, Vector2 } from '../math/index.js';
import { RigidBodyEcsComponent } from './components/index.js';

/**
 * Applies `impulse` at `impulseWorldPosition` to `rigidBody`'s velocity and
 * angular velocity. A no-op if `rigidBody.type` (see
 * {@link RigidBodyType}) isn't `'dynamic'`, since `'static'`/`'kinematic'`
 * bodies aren't affected by impulses.
 * @param impulse - The impulse to apply.
 * @param impulseWorldPosition - The world-space point `impulse` is applied
 * at.
 * @param entityPosition - `rigidBody`'s entity's current world position.
 * @param rigidBody - The rigid body to apply the impulse to.
 */
export function applyImpulse(
  impulse: Vector2,
  impulseWorldPosition: Vector2,
  entityPosition: Vector2,
  rigidBody: RigidBodyEcsComponent,
): void {
  if (rigidBody.type !== 'dynamic') {
    return;
  }

  // Clone before subtracting/multiplying: callers may pass the same object
  // for `impulseWorldPosition`/`entityPosition` (or a live world position),
  // and may reuse `impulse` afterward, so none of these may be mutated.
  const localPosition = Vec2.subtract(
    Vec2.clone(impulseWorldPosition),
    entityPosition,
  );
  const angularImpulse = Vec2.cross(localPosition, impulse);

  rigidBody.velocity = Vec2.add(
    rigidBody.velocity,
    Vec2.multiply(Vec2.clone(impulse), 1 / rigidBody.mass),
  );
  rigidBody.angularVelocity += angularImpulse / rigidBody.momentOfInertia;
}
