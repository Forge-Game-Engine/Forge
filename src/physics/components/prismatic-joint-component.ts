import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { PrismaticJoint } from '../joints/index.js';

/**
 * ECS-style component interface for a {@link PrismaticJoint}. Register
 * `createPrismaticJointEcsSystem` to have the joint added to the
 * `PhysicsWorld` while this component's entity exists, and removed when it
 * doesn't.
 */
export interface PrismaticJointEcsComponent {
  joint: PrismaticJoint;
}

export const PrismaticJointId =
  createComponentId<PrismaticJointEcsComponent>('PrismaticJoint');

/**
 * Attaches a {@link PrismaticJointEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the joint. `joint` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addPrismaticJointComponent(
  world: EcsWorld,
  entity: number,
  options: PrismaticJointEcsComponent,
): PrismaticJointEcsComponent {
  return world.addComponent(entity, PrismaticJointId, { ...options });
}
