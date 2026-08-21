import { ParentEcsComponent, parentId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { canvasId } from '../components/canvas-component.js';

/**
 * Walks `entity`'s `ParentEcsComponent` chain (starting at `entity` itself)
 * to find the `CanvasEcsComponent` entity it's ultimately parented to - the
 * canvas whose camera/culling mask/inputs govern it. Used by
 * `createUiRaycastEcsSystem` and `createUiInteractionEcsSystem` to group
 * interactables by canvas.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to find the owning canvas of.
 * @returns The owning canvas entity id, or `null` if `entity` isn't
 * (transitively) parented to one.
 */
export function findOwningCanvas(
  world: EcsWorld,
  entity: number,
): number | null {
  const visited = new Set<number>();

  let current: number | undefined = entity;

  while (current !== undefined && !visited.has(current)) {
    if (world.getComponent(current, canvasId)) {
      return current;
    }

    visited.add(current);

    current = world.getComponent<ParentEcsComponent>(current, parentId)?.parent;
  }

  return null;
}
