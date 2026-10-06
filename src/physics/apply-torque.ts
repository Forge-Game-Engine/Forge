import { EcsWorld } from '../ecs/ecs-world.js';
import { getRigidBodyMassData } from './rigid-body-mass-data.js';

/**
 * Applies a one-shot torque to `entity`'s rigid body for a single tick.
 *
 * Unlike an impulse applied via {@link applyImpulse} at a world point,
 * `torque` acts directly about the body's center of mass and needs no
 * anchor. Use this for direct, scripted, or player-driven torque (e.g. a
 * thruster held down for a frame); for torque that continuously drives a
 * body toward a target angular velocity, use an
 * `AngularVelocityMotorEcsComponent` instead.
 *
 * A no-op unless the entity's `RigidBodyEcsComponent.type` (see
 * {@link RigidBodyType}) is `'dynamic'`, since `'static'`/`'kinematic'`
 * bodies aren't affected by torque.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose rigid body to apply the torque to.
 * @param torque - The torque to apply, in newton-meters. Positive spins
 * counter-clockwise, matching `Vector2.cross`'s sign convention.
 * @param deltaTimeInSeconds - This tick's delta time, used to convert
 * `torque` into an angular impulse.
 * @throws An error if `entity` has a `'dynamic'` rigid body but no
 * `ColliderEcsComponent` to take its moment of inertia from.
 */
export function applyTorque(
  world: EcsWorld,
  entity: number,
  torque: number,
  deltaTimeInSeconds: number,
): void {
  const { rigidBody, invInertia } = getRigidBodyMassData(world, entity);

  if (rigidBody === null) {
    return;
  }

  rigidBody.angularVelocity += torque * deltaTimeInSeconds * invInertia;
}
