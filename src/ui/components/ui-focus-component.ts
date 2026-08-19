import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Explicit directional focus overrides for a `UiInteractableEcsComponent`.
 * Optional - every interactable is automatically focus-navigable by
 * `createUiNavigationEcsSystem`'s nearest-neighbor search, in the direction
 * `navigateInput` points, among the other interactables on the same canvas.
 * Add a `UiFocusEcsComponent` only to override that search on one or more
 * sides, e.g. to wrap focus from the last item in a row back to the first,
 * or to route around a layout where "nearest in that direction" isn't the
 * element you want.
 */
export interface UiFocusEcsComponent {
  /** The entity to focus on `navigateInput` pointing up, overriding the automatic search. */
  up?: number;

  /** The entity to focus on `navigateInput` pointing down, overriding the automatic search. */
  down?: number;

  /** The entity to focus on `navigateInput` pointing left, overriding the automatic search. */
  left?: number;

  /** The entity to focus on `navigateInput` pointing right, overriding the automatic search. */
  right?: number;
}

export const uiFocusId = createComponentId<UiFocusEcsComponent>('uiFocus');

/**
 * Attaches a {@link UiFocusEcsComponent} to `entity`, overriding
 * `createUiNavigationEcsSystem`'s automatic nearest-neighbor search on
 * whichever sides are given. Needs a `UiInteractableEcsComponent` on the
 * same entity to be reachable by navigation in the first place.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The directional overrides to set. Sides left unset keep
 * the automatic search.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addUiFocusComponent(
  world: EcsWorld,
  entity: number,
  options: UiFocusEcsComponent = {},
): UiFocusEcsComponent {
  return world.addComponent(entity, uiFocusId, { ...options });
}
