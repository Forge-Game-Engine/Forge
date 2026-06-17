import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Marks a UI entity as a keyboard-focus participant.
 * Entities without this component are skipped by tab order and spatial
 * navigation in {@link createUiKeyboardNavEcsSystem}.
 */
export interface UiFocusableEcsComponent {
  /**
   * Position in the sequential tab order.
   * Lower values come first; ties are broken by draw order / hierarchy position.
   * Use `0` for the default tab position (grouped with all other zero-index elements).
   */
  tabIndex: number;

  /**
   * When `false` the entity is excluded from focus traversal entirely.
   * A focused entity that becomes non-focusable loses focus immediately
   * on the next nav system tick.
   */
  focusable: boolean;
}

/** Component id for {@link UiFocusableEcsComponent}. */
export const uiFocusableId =
  createComponentId<UiFocusableEcsComponent>('ui-focusable');
