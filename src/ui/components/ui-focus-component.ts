import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Canvas-root focus tracker.
 * Exactly one entity per canvas may be focused at a time.
 * Written by {@link setFocus} and read by {@link createUiStateEcsSystem} and
 * {@link createUiKeyboardNavEcsSystem}.
 *
 * Attach this component to the same entity as {@link UiCanvasEcsComponent}.
 */
export interface UiFocusEcsComponent {
  /** Entity id of the currently focused element, or `null` if nothing is focused. */
  focused: number | null;

  /**
   * When `true` a focus ring should be rendered around the focused element.
   * Set to `true` when focus moves via keyboard, `false` when via pointer.
   * Rendering of the ring is left to the element's shader (Epics 5 / 8).
   */
  focusRing: boolean;
}

/** Component id for {@link UiFocusEcsComponent}. */
export const uiFocusId = createComponentId<UiFocusEcsComponent>('ui-focus');
