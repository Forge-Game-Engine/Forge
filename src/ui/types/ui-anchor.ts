import { Vector2 } from '../../math/index.js';

/**
 * The anchor/pivot fields a `UiAnchor` preset supplies, spread into
 * `addRectTransformComponent`'s options.
 */
export interface UiAnchorPreset {
  /** Normalized lower-left anchor within the parent's rect. */
  anchorMin: Vector2;
  /** Normalized upper-right anchor within the parent's rect. */
  anchorMax: Vector2;
  /** Normalized origin within the element's own rect. */
  pivot: Vector2;
}

const point = (x: number, y: number): UiAnchorPreset => ({
  anchorMin: { x, y },
  anchorMax: { x, y },
  pivot: { x, y },
});

/**
 * Common anchor/pivot presets for `RectTransformEcsComponent`, expressing
 * the "pin to corner/edge/center" and "stretch" cases `resolveRect` supports
 * without hand writing `anchorMin`/`anchorMax`/`pivot` triples. Spread one into
 * `addRectTransformComponent`'s options (e.g.
 * `addRectTransformComponent(world, entity, { ...UiAnchor.topLeft, sizeDelta })`).
 * These are shared, module-level objects, but that's safe: every call to
 * `addRectTransformComponent` clones the `Vector2`s it's given into fresh
 * instances rather than holding onto the ones passed in, so no entity's
 * component ever ends up aliasing (or mutating) a preset here.
 */
export const UiAnchor: Readonly<Record<string, UiAnchorPreset>> = {
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
   * common "HUD top bar" anchor. `sizeDelta.y` sets the band's height (it's
   * point-anchored vertically); `sizeDelta.x` is a horizontal margin.
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
   * common "HUD bottom bar" anchor. `sizeDelta.y` sets the band's height.
   */
  stretchBottom: {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 1, y: 0 },
    pivot: { x: 0.5, y: 0 },
  },

  /**
   * A full-height vertical band pinned to the parent's left edge - the
   * common "side panel" anchor. `sizeDelta.x` sets the band's width.
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
   * `sizeDelta.x` sets the band's width.
   */
  stretchRight: {
    anchorMin: { x: 1, y: 0 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 1, y: 0.5 },
  },

  /** Stretches to fill the parent's full rect. */
  stretchAll: {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 1, y: 1 },
    pivot: { x: 0.5, y: 0.5 },
  },
};
