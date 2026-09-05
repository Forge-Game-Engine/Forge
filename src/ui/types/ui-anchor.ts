import { Vector2 } from '../../math/index.js';

/**
 * The anchor/pivot fields a `UiAnchor` preset supplies, spread into
 * `addRectTransformComponent`'s options.
 */
export interface AnchorPivotConfig {
  /** Normalized lower-left anchor within the parent's rect. */
  anchorMin: Vector2;
  /** Normalized upper-right anchor within the parent's rect. */
  anchorMax: Vector2;
  /** Normalized origin within the element's own rect. */
  pivot: Vector2;
}

const point = (x: number, y: number): AnchorPivotConfig => ({
  anchorMin: { x, y },
  anchorMax: { x, y },
  pivot: { x, y },
});

/**
 * Common anchor/pivot presets for `RectTransformEcsComponent`, expressing
 * the "pin to corner/edge/center" and "stretch" cases `resolveRect` supports
 * without hand writing `anchorMin`/`anchorMax`/`pivot` triples. Spread one into
 * `addRectTransformComponent`'s options (e.g.
 * `addRectTransformComponent(world, entity, { ...UiAnchor.topLeft, sizeOrMargin })`).
 * These are shared, module-level objects, but that's safe: every call to
 * `addRectTransformComponent` clones the `Vector2`s it's given into fresh
 * instances rather than holding onto the ones passed in, so no entity's
 * component ever ends up aliasing (or mutating) a preset here.
 */
export const UiAnchor = {
  topLeft: point(0, 1),
  topCenter: point(0.5, 1),
  topRight: point(1, 1),
  middleLeft: point(0, 0.5),
  center: point(0.5, 0.5),
  middleRight: point(1, 0.5),
  bottomLeft: point(0, 0),
  bottomCenter: point(0.5, 0),
  bottomRight: point(1, 0),

  /**
   * A full-width horizontal band pinned to the parent's top edge - the
   * common "HUD top bar" anchor. `sizeOrMargin.y` sets the band's height (it's
   * point-anchored vertically); `sizeOrMargin.x` is a horizontal margin.
   */
  stretchTop: {
    anchorMin: { x: 0, y: 1 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 0.5, y: 1 },
  },

  /** Stretches to fill the parent's full width, vertically centered. */
  stretchHorizontal: {
    anchorMin: { x: 0, y: 0.5 },
    anchorMax: { x: 1, y: 0.5 },
    pivot: { x: 0.5, y: 0.5 },
  },

  /**
   * A full-width horizontal band pinned to the parent's bottom edge - the
   * common "HUD bottom bar" anchor. `sizeOrMargin.y` sets the band's height.
   */
  stretchBottom: {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 1, y: 0 },
    pivot: { x: 0.5, y: 0 },
  },

  /**
   * A full-height vertical band pinned to the parent's left edge - the
   * common "side panel" anchor. `sizeOrMargin.x` sets the band's width.
   */
  stretchLeft: {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 0, y: 1 },
    pivot: { x: 0, y: 0.5 },
  },

  /** Stretches to fill the parent's full height, horizontally centered. */
  stretchVertical: {
    anchorMin: { x: 0.5, y: 0 },
    anchorMax: { x: 0.5, y: 1 },
    pivot: { x: 0.5, y: 0.5 },
  },

  /**
   * A full-height vertical band pinned to the parent's right edge.
   * `sizeOrMargin.x` sets the band's width.
   */
  stretchRight: {
    anchorMin: { x: 1, y: 0 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 1, y: 0.5 },
  },

  /**
   * Stretches to fill the parent's full rect. A `TextEcsComponent` child
   * anchored this way centers/right-aligns/justifies correctly despite the
   * center pivot: `createUiLayoutEcsSystem` syncs both `maxWidth` and
   * `horizontalAlignPivot` from this rect every frame for any stretch-x
   * anchor, not just left-pivoted ones (see its own doc comment).
   */
  stretchAll: {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 0.5, y: 0.5 },
  },

  /**
   * Stretches to fill the parent's full width, vertically centered, with
   * its pivot on the left edge rather than the center - unlike
   * `stretchHorizontal`. A `TextEcsComponent` child centers/right-aligns/
   * justifies correctly under either preset - `createUiLayoutEcsSystem`
   * syncs `horizontalAlignPivot` from whichever pivot the anchor uses, not
   * just a left one (see its own doc comment) - so reach for this preset
   * when you specifically want the rect's own local origin (e.g. for
   * manual position math, or a non-text child) on the left edge rather
   * than the center; it's no longer required just to make text alignment
   * work.
   */
  stretchHorizontalLeft: {
    anchorMin: { x: 0, y: 0.5 },
    anchorMax: { x: 1, y: 0.5 },
    pivot: { x: 0, y: 0.5 },
  },

  /**
   * A full-width horizontal band pinned to the parent's top edge, like
   * `stretchTop`, but with its pivot on the left edge rather than the
   * center - see `stretchHorizontalLeft`'s own doc comment for what that's
   * useful for. `sizeOrMargin.y` still sets the band's height (point-anchored
   * vertically); `sizeOrMargin.x` is still a horizontal margin.
   */
  stretchTopLeft: {
    anchorMin: { x: 0, y: 1 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 0, y: 1 },
  },
} as const;
