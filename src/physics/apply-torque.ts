import { RigidBodyEcsComponent } from './components/index.js';

/**
 * Applies a one-shot torque to `rigidBody` for a single tick.
 *
 * Unlike an impulse applied via {@link applyImpulse} at a world point,
 * `torque` acts directly about the body's center of mass and needs no
 * anchor. Use this for direct, scripted, or player-driven torque (e.g. a
 * thruster held down for a frame); for torque that continuously drives a
 * body toward a target angular velocity, use an
 * `AngularVelocityMotorEcsComponent` instead.
 *
 * A no-op if `rigidBody.type` (see {@link RigidBodyType}) isn't
 * `'dynamic'`, since `'static'`/`'kinematic'` bodies aren't affected by
 * torque.
 * @param torque - The torque to apply, in newton-meters. Positive spins
 * counter-clockwise, matching `Vector2.cross`'s sign convention.
 * @param deltaTimeInSeconds - This tick's delta time, used to convert
 * `torque` into an angular impulse.
 * @param rigidBody - The rigid body to apply the torque to.
 */
export function applyTorque(
  torque: number,
  deltaTimeInSeconds: number,
  rigidBody: RigidBodyEcsComponent,
): void {
  if (rigidBody.type !== 'dynamic') {
    return;
  }

  rigidBody.angularVelocity +=
    (torque * deltaTimeInSeconds) / rigidBody.momentOfInertia;
}
