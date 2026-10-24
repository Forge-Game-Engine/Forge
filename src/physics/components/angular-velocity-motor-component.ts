import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for a standalone angular velocity motor,
 * driving a single entity's `RigidBodyEcsComponent.angularVelocity` toward
 * `targetVelocity` each tick, clamped by `maxTorque`. Unlike a joint, this
 * has no warm-start state: it's recomputed fresh from the body's current
 * angular velocity every tick, so it recovers automatically after an
 * external velocity change (e.g. a collision).
 *
 * A motor with a non-zero `targetVelocity` and a positive `maxTorque` keeps
 * a `'dynamic'` body awake, even while something stalls it: the sleep
 * system doesn't count the body as resting, and setting `targetVelocity` on
 * a sleeping body wakes its island on the sleep system's next run. A motor
 * whose `targetVelocity` is `0` (a brake) lets its body fall asleep.
 */
export interface AngularVelocityMotorEcsComponent {
  /** The angular velocity, in radians/second, the motor drives the entity toward. */
  targetVelocity: number;
  /** The maximum torque, in newton-meters, the motor may apply in a single tick. */
  maxTorque: number;
}

export const angularVelocityMotorId =
  createComponentId<AngularVelocityMotorEcsComponent>('angular-velocity-motor');

/**
 * Attaches an {@link AngularVelocityMotorEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to; must already have
 * a `RigidBodyEcsComponent`.
 * @param options - Options for configuring the motor.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAngularVelocityMotorComponent(
  world: EcsWorld,
  entity: number,
  options: AngularVelocityMotorEcsComponent,
): AngularVelocityMotorEcsComponent {
  const component: AngularVelocityMotorEcsComponent = { ...options };

  return world.addComponent(entity, angularVelocityMotorId, component);
}
