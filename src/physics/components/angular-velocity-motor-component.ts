import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for a controlled rotational motor. Unlike a
 * one-shot or manually-driven torque (applied directly via
 * `RigidBody.applyTorque`, with no engine-provided component of its own),
 * this drives the entity's `PhysicsBodyEcsComponent.physicsBody` towards
 * `targetVelocity` every tick, spending no more than `maxTorque` to do so.
 * Register `createAngularVelocityMotorEcsSystem` to apply it. Use this for a
 * spinning fan, or a car wheel that should hold a speed rather than receive
 * a one-shot push.
 */
export interface AngularVelocityMotorEcsComponent {
  /**
   * The angular velocity this motor drives the body towards, in rad/s.
   */
  targetVelocity: number;

  /**
   * The maximum torque, in N·m, the motor may apply in a single tick while
   * driving towards `targetVelocity`. Limits how quickly angular velocity
   * can change; a body with high inertia relative to `maxTorque` approaches
   * `targetVelocity` gradually rather than snapping to it.
   */
  maxTorque: number;
}

export const AngularVelocityMotorId =
  createComponentId<AngularVelocityMotorEcsComponent>('AngularVelocityMotor');

/**
 * Attaches an {@link AngularVelocityMotorEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the motor. Neither
 * `targetVelocity` nor `maxTorque` has a sensible default and both must
 * always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAngularVelocityMotorComponent(
  world: EcsWorld,
  entity: number,
  options: AngularVelocityMotorEcsComponent,
): AngularVelocityMotorEcsComponent {
  return world.addComponent(entity, AngularVelocityMotorId, { ...options });
}
