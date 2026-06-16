import { createComponentId } from '../../ecs/ecs-component.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';

/**
 * Core box model for a UI element. Coordinates are screen-space pixels
 * (top-left origin, +Y down).
 *
 * ## Anchors and offsets
 *
 * `anchorMin` / `anchorMax` are normalised (0–1) corners of an *anchor rect*
 * within the parent's `resolvedRect`. When `anchorMin === anchorMax` (a *point
 * anchor*), `offsetMin` / `offsetMax` encode the element's position and size
 * relative to that point. When they differ (a *stretch anchor*), the offsets
 * act as pixel insets from the stretched anchor edges.
 *
 * ### Point anchor example
 * `anchorMin = anchorMax = (0.5, 0.5)`, `offsetMin = (-50, -25)`,
 * `offsetMax = (50, 25)` → a 100 × 50 element centred in the parent.
 *
 * ### Stretch anchor example
 * `anchorMin = (0, 0)`, `anchorMax = (1, 1)`, `offsetMin = (10, 10)`,
 * `offsetMax = (-10, -10)` → full-parent fill with 10 px margins.
 *
 * ## Resolved output
 * `resolvedRect` and `worldMatrix` are written by {@link createUiLayoutEcsSystem}
 * and must not be set by user code directly.
 */
export interface UiTransformEcsComponent {
  /**
   * Normalised (0–1) minimum corner of the anchor rect within the parent
   * `resolvedRect`. Equal to `anchorMax` for a point anchor.
   */
  anchorMin: Vector2;

  /**
   * Normalised (0–1) maximum corner of the anchor rect within the parent
   * `resolvedRect`. Equal to `anchorMin` for a point anchor.
   */
  anchorMax: Vector2;

  /**
   * Pixel offset from the anchor-min point to this element's top-left edge.
   * With point anchors this encodes position+size; with stretch anchors it
   * encodes the margin from the parent's corresponding edge.
   */
  offsetMin: Vector2;

  /**
   * Pixel offset from the anchor-max point to this element's bottom-right edge.
   * Negative values inset the element from the anchor-max edge.
   */
  offsetMax: Vector2;

  /**
   * Normalised (0–1) pivot point within the element's `resolvedRect`.
   * Rotation and scale are applied around this point. Default `(0.5, 0.5)`.
   */
  pivot: Vector2;

  /** Rotation in radians, applied around `pivot`. */
  rotation: number;

  /** Scale applied around `pivot`. */
  scale: Vector2;

  /**
   * Axis-aligned bounding rect in screen-space pixels. Computed each frame by
   * the layout system. Do not write from user code.
   */
  resolvedRect: Rect;

  /**
   * Full 2D affine transform from a unit [0,1]×[0,1] quad to screen space,
   * including position, rotation, scale and size. Computed each frame by the
   * layout system. Do not write from user code.
   */
  worldMatrix: Matrix3x3;

  /**
   * When `true` and the entire parent chain is also static, the layout system
   * computes this element's rect once and skips it on every subsequent frame.
   * Defaults to `false` (recompute every frame). Validated as an optimisation
   * in Epic 9.
   */
  isStatic?: boolean;

  /**
   * Internal dirty flag. Set to `true` to force a recompute even when
   * `isStatic` is `true`. Cleared by the layout system after recomputing.
   */
  isDirty?: boolean;
}

/** Component id for {@link UiTransformEcsComponent}. */
export const uiTransformId =
  createComponentId<UiTransformEcsComponent>('ui-transform');
