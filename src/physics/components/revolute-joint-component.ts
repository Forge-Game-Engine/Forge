import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { RevoluteJoint } from '../joints/index.js';

/**
 * ECS-style component interface for a {@link RevoluteJoint}. Register
 * `createRevoluteJointEcsSystem` to have the joint added to the
 * `PhysicsWorld` while this component's entity exists, and removed when it
 * doesn't.
 */
export interface RevoluteJointEcsComponent {
  joint: RevoluteJoint;
}

export const RevoluteJointId =
  createComponentId<RevoluteJointEcsComponent>('RevoluteJoint');

/**
 * Attaches a {@link RevoluteJointEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the joint. `joint` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRevoluteJointComponent(
  world: EcsWorld,
  entity: number,
  options: RevoluteJointEcsComponent,
): RevoluteJointEcsComponent {
  return world.addComponent(entity, RevoluteJointId, { ...options });
}
