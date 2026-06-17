import { createComponentId } from '../../ecs/ecs-component.js';
import { Vector2 } from '../../math/index.js';

/**
 * Stores the current pointer hit-test result for a UI canvas root.
 * Written every frame by {@link createUiHitTestEcsSystem} and read by
 * {@link createUiStateEcsSystem} to drive element state transitions.
 *
 * Attach this component to the same entity as {@link UiCanvasEcsComponent}.
 */
export interface UiPointerStateEcsComponent {
  /** Entity id of the topmost interactable element under the pointer, or `null`. */
  hovered: number | null;

  /**
   * Entity id of the element that received the current press-start, or `null`.
   * Remains set until the pointer button is released, even if the pointer
   * moves off the element (enabling drag-to-cancel behaviour).
   */
  pressed: number | null;

  /** Current pointer position in UI screen-space (CSS pixels, top-left origin). */
  pointer: Vector2;
}

/** Component id for {@link UiPointerStateEcsComponent}. */
export const uiPointerStateId =
  createComponentId<UiPointerStateEcsComponent>('ui-pointer-state');
