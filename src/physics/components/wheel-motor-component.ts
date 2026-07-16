import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for a motorized wheel. Consumed by
 * `createWheelMotorEcsSystem`, which applies a bounded torque to the
 * entity's `PhysicsBodyEcsComponent` each tick to drive `angularVelocity`
 * toward `targetAngularVelocity`.
 */
export interface WheelMotorEcsComponent {
  /**
   * The angular velocity, in radians per second, the motor drives the
   * wheel's `RigidBody` toward.
   */
  targetAngularVelocity: number;

  /**
   * The maximum torque the motor may apply in a single tick to close the
   * gap to `targetAngularVelocity`. Bounds how quickly the wheel can spin
   * up, and (combined with the ground's friction) how much traction the
   * wheel can exert.
   */
  maxTorque: number;
}

export const WheelMotorId =
  createComponentId<WheelMotorEcsComponent>('WheelMotor');

/**
 * Attaches a {@link WheelMotorEcsComponent} to `entity`. The entity must
 * also have a `PhysicsBodyEcsComponent` for `createWheelMotorEcsSystem` to
 * drive.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the motor.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addWheelMotorComponent(
  world: EcsWorld,
  entity: number,
  options: WheelMotorEcsComponent,
): WheelMotorEcsComponent {
  return world.addComponent(entity, WheelMotorId, { ...options });
}
