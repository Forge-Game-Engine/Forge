import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for Parent.
 */
export interface ParentEcsComponent {
  parent: number;

  /**
   * Whether this entity inherits its parent's world rotation -
   * `createTransformEcsSystem` applies this both when rotating this
   * entity's local position offset by the parent's world rotation, and
   * (if this entity has its own `RotationEcsComponent`) when composing
   * this entity's world rotation from the parent's. Defaults to `true` -
   * the ordinary case of a child that rotates and orbits with its parent,
   * e.g. a turret mounted on a rotating tank. Set to `false` for a child
   * that should only follow its parent's world *position*, never its
   * rotation - e.g. a health bar, nameplate, or other world-space UI
   * canvas attached to a rotating/facing character, which should stay
   * upright and directly above it rather than swinging around as the
   * character turns.
   */
  inheritRotation?: boolean;
}

export const parentId = createComponentId<ParentEcsComponent>('Parent');

/**
 * Attaches a {@link ParentEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the parent. `parent` (the parent
 * entity's id) has no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addParentComponent(
  world: EcsWorld,
  entity: number,
  options: ParentEcsComponent,
): ParentEcsComponent {
  return world.addComponent(entity, parentId, { ...options });
}
