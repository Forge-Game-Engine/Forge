import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Marks a UI entity as a rectangular clip region.
 *
 * When present, the entity's `resolvedRect` (from {@link UiTransformEcsComponent})
 * is used as a clip boundary.  Descendant elements have their
 * `UiTransformEcsComponent.clipRect` set to the intersection of this rect
 * and any ancestor clip rects.  The default UI shader discards fragments
 * outside `clipRect`.
 *
 * Clip rects always intersect, never union, when nested.
 */
export interface UiClipEcsComponent {
  /** When `false` clipping is bypassed as if this component were absent. */
  enabled: boolean;
}

/** Component id for {@link UiClipEcsComponent}. */
export const uiClipId = createComponentId<UiClipEcsComponent>('ui-clip');
