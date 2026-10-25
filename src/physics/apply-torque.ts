import { EcsWorld } from '../ecs/ecs-world.js';
import { getRigidBodyMassData } from './rigid-body-mass-data.js';

/**
 * Applies a one-shot torque to `entity`'s rigid body for a single step.
 *
 * Unlike an impulse applied via {@link applyImpulse} at a world point,
 * `torque` acts directly about the body's center of mass and needs no
 * anchor. Use this for direct, scripted, or player-driven torque (e.g. a
 * thruster held down, applied each step by a system in the fixed-update
 * group); for torque that continuously drives a
 * body toward a target angular velocity, use an
 * `AngularVelocityMotorEcsComponent` instead.
 *
 * A no-op unless the entity's `RigidBodyEcsComponent.type` (see
 * {@link RigidBodyType}) is `'dynamic'`, since `'static'`/`'kinematic'`
 * bodies aren't affected by torque.
 *
 * A sleeping body needs no separate wake-up. The angular velocity this
 * writes makes it count as awake right away (see {@link isBodyAwake}), so
 * integration turns it this tick, and `createSleepEcsSystem` wakes its
 * island on its next pass: on this tick when the torque is applied before
 * `createTransformEcsSystem` runs, otherwise on the next.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose rigid body to apply the torque to.
 * @param torque - The torque to apply, in newton-meters. Positive spins
 * `+X` towards `+Y` (clockwise on screen), matching `Vector2.cross`'s sign convention.
 * @param deltaTimeInSeconds - The duration the torque acts for (the
 * step's delta time inside a fixed step), used to convert
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
