import { Vector2 } from '../../math/index.js';
import { UiAxis } from './ui-axis.js';

/**
 * The `x`/`y` axis pair a `UiAnchor` preset produces, spread into
 * `addRectTransformComponent`'s options (e.g. `addRectTransformComponent(world,
 * entity, UiAnchor.topLeft({ x: 200, y: 60 }))`).
 */
export interface UiAnchorConfig {
  x: UiAxis;
  y: UiAxis;
}

const defaultPointSize: Vector2 = { x: 100, y: 100 };
const defaultStretchMargin: Vector2 = { x: 0, y: 0 };

/**
 * A preset whose `x` and `y` are both point-anchored - callers supply the
 * element's literal size on each axis. Each axis's pivot defaults to its
 * own anchor value (`UiAxis.point`'s own default), matching every
 * corner/edge/center preset below, none of which need a pivot independent
 * of where they anchor.
 */
const point =
  (anchorX: number, anchorY: number) =>
  (size: Vector2 = defaultPointSize): UiAnchorConfig => ({
    x: UiAxis.point(anchorX, { size: size.x }),
    y: UiAxis.point(anchorY, { size: size.y }),
  });

/**
 * Options for a `UiAnchor` preset that stretches horizontally (a "band"
 * spanning the parent's full width) but is point-anchored vertically.
 */
export interface UiHorizontalBandOptions {
  /** The band's height, in reference pixels - the vertical axis is point-anchored, so this is a literal size. */
  height: number;

  /** Margin added to the band's horizontal span, in reference pixels. Defaults to `0`. */
  horizontalMargin?: number;
}

/** A preset whose `x` stretches full-width and `y` is a point anchor - callers supply the band's height and an optional horizontal margin. */
const horizontalBand =
  (verticalAnchor: number, pivotX: number) =>
  ({
    height,
    horizontalMargin = 0,
  }: UiHorizontalBandOptions): UiAnchorConfig => ({
    x: UiAxis.stretch(
      { min: 0, max: 1 },
      { pivot: pivotX, margin: horizontalMargin },
    ),
    y: UiAxis.point(verticalAnchor, { size: height }),
  });

/**
 * Options for a `UiAnchor` preset that stretches vertically (a "band"
 * spanning the parent's full height) but is point-anchored horizontally.
 */
export interface UiVerticalBandOptions {
  /** The band's width, in reference pixels - the horizontal axis is point-anchored, so this is a literal size. */
  width: number;

  /** Margin added to the band's vertical span, in reference pixels. Defaults to `0`. */
  verticalMargin?: number;
}

/** A preset whose `y` stretches full-height and `x` is a point anchor - callers supply the band's width and an optional vertical margin. */
const verticalBand =
  (horizontalAnchor: number, pivotY: number) =>
  ({ width, verticalMargin = 0 }: UiVerticalBandOptions): UiAnchorConfig => ({
    x: UiAxis.point(horizontalAnchor, { size: width }),
    y: UiAxis.stretch(
      { min: 0, max: 1 },
      { pivot: pivotY, margin: verticalMargin },
    ),
  });

/**
 * Common anchor/pivot presets for `RectTransformEcsComponent`, expressing
 * the "pin to corner/edge/center" and "stretch" cases `resolveRect` supports
 * without hand writing `x`/`y` axis descriptors. Each preset is a factory -
 * call it with the size/margin values that actually apply to *its* axes
 * (a point-anchored axis takes a literal size, a stretch-anchored axis
 * takes a margin - never both for the same axis) and spread the result into
 * `addRectTransformComponent`'s options, e.g.
 * `addRectTransformComponent(world, entity, UiAnchor.topLeft({ x: 200, y: 60 }))`.
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
   * common "HUD top bar" anchor. `height` sets the band's height (it's
   * point-anchored vertically); `horizontalMargin` is a horizontal margin.
   */
  stretchTop: horizontalBand(1, 0.5),

  /** Stretches to fill the parent's full width, vertically centered. */
  stretchHorizontal: horizontalBand(0.5, 0.5),

  /**
   * A full-width horizontal band pinned to the parent's bottom edge - the
   * common "HUD bottom bar" anchor. `height` sets the band's height.
   */
  stretchBottom: horizontalBand(0, 0.5),

  /**
   * A full-height vertical band pinned to the parent's left edge - the
   * common "side panel" anchor. `width` sets the band's width.
   */
  stretchLeft: verticalBand(0, 0.5),

  /** Stretches to fill the parent's full height, horizontally centered. */
  stretchVertical: verticalBand(0.5, 0.5),

  /**
   * A full-height vertical band pinned to the parent's right edge.
   * `width` sets the band's width.
   */
  stretchRight: verticalBand(1, 0.5),

  /**
   * Stretches to fill the parent's full rect. A `TextEcsComponent` child
   * anchored this way centers/right-aligns/justifies correctly despite the
   * center pivot: `createUiLayoutEcsSystem` syncs both `maxWidth` and
   * `horizontalAlignPivot` from this rect every frame for any stretch-x
   * anchor, not just left-pivoted ones (see its own doc comment).
   * `margin` is added to both axes' anchored span. Defaults to `{x: 0, y: 0}`.
   */
  stretchAll: (margin: Vector2 = defaultStretchMargin): UiAnchorConfig => ({
    x: UiAxis.stretch({ min: 0, max: 1 }, { margin: margin.x }),
    y: UiAxis.stretch({ min: 0, max: 1 }, { margin: margin.y }),
  }),

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
  stretchHorizontalLeft: horizontalBand(0.5, 0),

  /**
   * A full-width horizontal band pinned to the parent's top edge, like
   * `stretchTop`, but with its pivot on the left edge rather than the
   * center - see `stretchHorizontalLeft`'s own doc comment for what that's
   * useful for. `height` still sets the band's height (point-anchored
   * vertically); `horizontalMargin` is still a horizontal margin.
   */
  stretchTopLeft: horizontalBand(1, 0),

  /**
   * The mirror image of `stretchTopLeft` - a full-width horizontal band
   * pinned to the parent's top edge, with its pivot on the right edge
   * rather than the left or center. Useful for the same reasons
   * `stretchHorizontalLeft`/`stretchTopLeft` are (manual position math, or a
   * non-text child, anchored from the right edge instead) - not for
   * `horizontalAlign`, which works under any pivot on a stretch-x anchor
   * (see `createUiLayoutEcsSystem`'s own doc comment on `horizontalAlignPivot`
   * syncing). `height` still sets the band's height (point-anchored
   * vertically); `horizontalMargin` is still a horizontal margin.
   */
  stretchTopRight: horizontalBand(1, 1),
};
