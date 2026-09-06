import { Vector2 } from '../../math/index.js';

/**
 * A normalized alignment fraction, in the same `(0, 0)` = bottom-left,
 * `(1, 1)` = top-right convention as `RectTransformEcsComponent.pivot` -
 * where a layout group places its children within any leftover space on
 * each axis, after the children's own sizes (and spacing) are subtracted
 * from the group's content box.
 */
export type UiAlignment = Vector2;

/**
 * Common `childAlignment` presets for `HorizontalLayoutGroupEcsComponent`/
 * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent`, named the
 * same way as `UiAnchor`'s nine point presets. These are shared, module-level
 * objects - safe to reference directly, since nothing in this module mutates
 * a `childAlignment` value after reading it.
 */
export const uiAlignments: Readonly<Record<string, UiAlignment>> = {
  topLeft: { x: 0, y: 1 },
  topCenter: { x: 0.5, y: 1 },
  topRight: { x: 1, y: 1 },
  middleLeft: { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  middleRight: { x: 1, y: 0.5 },
  bottomLeft: { x: 0, y: 0 },
  bottomCenter: { x: 0.5, y: 0 },
  bottomRight: { x: 1, y: 0 },
};
