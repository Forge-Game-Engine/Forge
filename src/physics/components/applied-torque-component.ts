import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for a torque applied during the current
 * physics tick. Register `createAppliedTorqueEcsSystem` to have `value`
 * applied to the entity's `PhysicsBodyEcsComponent.physicsBody` every tick
 * (via `RigidBody.applyTorque`); the system resets `value` back to `0` after
 * applying it, so a continuous push (a held-down thruster, a spinning fan)
 * requires setting `value` again every tick it should keep acting, while a
 * single kick just sets it once.
 */
export interface AppliedTorqueEcsComponent {
  /**
   * The torque to apply this physics tick, in N·m.
   */
  value: number;
}

export const AppliedTorqueId =
  createComponentId<AppliedTorqueEcsComponent>('AppliedTorque');

const defaultAppliedTorqueOptions: AppliedTorqueEcsComponent = {
  value: 0,
};

/**
 * Attaches an {@link AppliedTorqueEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the applied torque.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAppliedTorqueComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<AppliedTorqueEcsComponent> = {},
): AppliedTorqueEcsComponent {
  const component: AppliedTorqueEcsComponent = {
    ...defaultAppliedTorqueOptions,
    ...options,
  };

  return world.addComponent(entity, AppliedTorqueId, component);
}
