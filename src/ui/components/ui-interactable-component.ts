import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Marks a UI entity as a participant in pointer hit-testing.
 * Only entities with this component are considered when resolving which element
 * is under the pointer each frame.
 *
 * Attach to any entity that also has a {@link UiTransformEcsComponent}.
 */
export interface UiInteractableEcsComponent {
  /**
   * When `false` the entity is excluded from hit-testing entirely.
   * Default `true`.
   */
  enabled: boolean;

  /**
   * When `true`, hit-testing stops at this element — elements behind it in
   * z-order are not considered for the current frame's hit result.
   * Set to `false` for transparent/pass-through overlays.
   * Default `true`.
   */
  blocksPointer: boolean;

  /**
   * Expands the hit region by this many CSS pixels on all sides.
   * Useful for small tap targets. Default `0`.
   */
  hitPadding?: number;
}

/** Component id for {@link UiInteractableEcsComponent}. */
export const uiInteractableId =
  createComponentId<UiInteractableEcsComponent>('ui-interactable');
