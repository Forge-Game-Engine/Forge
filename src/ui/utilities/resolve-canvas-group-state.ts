import { ParentEcsComponent, parentId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  CanvasGroupEcsComponent,
  canvasGroupId,
} from '../components/canvas-group-component.js';

/** The combined effect of every `CanvasGroupEcsComponent` governing an entity - see `resolveCanvasGroupState`. */
export interface CanvasGroupState {
  /** The product of every governing group's `alpha`. `1` if none govern this entity. */
  alpha: number;

  /** Whether every governing group's `interactable` is `true`. `true` if none govern this entity. */
  interactable: boolean;

  /** Whether every governing group's `blocksRaycasts` is `true`. `true` if none govern this entity. */
  blocksRaycasts: boolean;
}

const identityCanvasGroupState: CanvasGroupState = {
  alpha: 1,
  interactable: true,
  blocksRaycasts: true,
};

/**
 * Walks `entity`'s `ParentEcsComponent` chain (starting at `entity` itself)
 * combining every `CanvasGroupEcsComponent` found along the way: `alpha`
 * multiplies, `interactable`/`blocksRaycasts` AND together. The walk stops
 * after including a group whose `ignoreParentGroups` is `true` - that
 * group's own values still apply, but nothing further up the chain does.
 *
 * Used by `createUiCanvasGroupEcsSystem` (alpha) and by
 * `createUiRaycastEcsSystem`/`createUiInteractionEcsSystem`/
 * `createUiNavigationEcsSystem` (interactable/blocksRaycasts) so a group's
 * effect reaches every descendant without mutating each one's own
 * `UiInteractableEcsComponent`/`SpriteEcsComponent`/`TextEcsComponent`
 * fields - only the generic `opacityMultiplier` fields are ever written,
 * leaving each element's own authored tint/interactable/blocksRaycasts
 * untouched underneath.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to resolve the combined canvas group state for.
 * @returns The combined `alpha`/`interactable`/`blocksRaycasts`, `{ alpha: 1, interactable: true, blocksRaycasts: true }` if no `CanvasGroupEcsComponent` governs `entity` at all.
 */
export function resolveCanvasGroupState(
  world: EcsWorld,
  entity: number,
): CanvasGroupState {
  let alpha = 1;
  let interactable = true;
  let blocksRaycasts = true;

  const visited = new Set<number>();
  let current: number | undefined = entity;

  while (current !== undefined && !visited.has(current)) {
    visited.add(current);

    const group = world.getComponent<CanvasGroupEcsComponent>(
      current,
      canvasGroupId,
    );

    if (group) {
      alpha *= group.alpha;
      interactable &&= group.interactable;
      blocksRaycasts &&= group.blocksRaycasts;

      if (group.ignoreParentGroups) {
        break;
      }
    }

    current = world.getComponent<ParentEcsComponent>(current, parentId)?.parent;
  }

  return alpha === 1 && interactable && blocksRaycasts
    ? identityCanvasGroupState
    : { alpha, interactable, blocksRaycasts };
}
