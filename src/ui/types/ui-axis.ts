/**
 * A point-anchored axis: `anchor` is a single normalized position within the
 * parent's rect on this axis (the element's own `anchorMin`/`anchorMax` on
 * this axis coincide), so the element keeps its own literal `size` and moves
 * with the anchor rather than resizing with the parent.
 */
export interface UiPointAxis {
  kind: 'point';

  /** Normalized anchor position within the parent's rect on this axis. */
  anchor: number;

  /** Normalized origin within the element's own rect on this axis. */
  pivot: number;

  /** The element's literal size on this axis, in reference pixels. */
  size: number;
}

/**
 * A stretch-anchored axis: `anchorMin`/`anchorMax` mark a span of the
 * parent's rect on this axis, so the element resizes with the parent, with
 * `margin` added to (or, if negative, subtracted from) that span.
 */
export interface UiStretchAxis {
  kind: 'stretch';

  /** Normalized lower anchor bound within the parent's rect on this axis. */
  anchorMin: number;

  /** Normalized upper anchor bound within the parent's rect on this axis. */
  anchorMax: number;

  /** Normalized origin within the element's own rect on this axis. */
  pivot: number;

  /** Margin added to the anchor span's size on this axis, in reference pixels. */
  margin: number;
}

/**
 * One axis (`x` or `y`) of a `RectTransformEcsComponent`. Every field a
 * `UiPointAxis` needs (`size`) is meaningless for a `UiStretchAxis` (which
 * needs `margin` instead) and vice versa, so the two are modeled as a
 * discriminated union on `kind` rather than one shape carrying both a
 * `size` and a `margin` field of which only one actually applies - this is
 * what makes it impossible to, say, set a `margin` on an axis that's
 * actually point-anchored. Construct one with {@link UiAxis}'s own
 * `point`/`stretch` factories rather than a raw object literal.
 */
export type UiAxis = UiPointAxis | UiStretchAxis;

/**
 * Fields of {@link UiPointAxis} with a sensible default; callers may omit
 * these.
 */
export interface UiPointAxisOptions {
  /** Defaults to `100`. */
  size?: number;

  /** Defaults to `anchor` - the common case of a preset pinned to a corner/edge/center keeping its own local origin at the same normalized point. */
  pivot?: number;
}

/**
 * Fields of {@link UiStretchAxis} with a sensible default; callers may omit
 * these.
 */
export interface UiStretchAxisOptions {
  /** Defaults to `0`. */
  margin?: number;

  /** Defaults to `0.5`. */
  pivot?: number;
}

/** The normalized `[min, max]` span a `UiStretchAxis` anchors to within the parent's rect on this axis. */
export interface UiStretchAxisRange {
  min: number;
  max: number;
}

const defaultUiPointAxisOptions = {
  size: 100,
};

const defaultUiStretchAxisOptions = {
  margin: 0,
  pivot: 0.5,
};

/**
 * Factories for {@link UiAxis}. Use these (rather than a raw object literal)
 * to build one axis of a `RectTransformEcsComponent.x`/`.y`, or of a
 * `UiAnchor` preset's own `x`/`y`.
 */
export const UiAxis = {
  /**
   * Creates a {@link UiPointAxis}.
   * @param anchor - Normalized anchor position within the parent's rect on this axis.
   * @param options - Options for configuring the axis. `pivot` defaults to `anchor`; `size` defaults to `100`.
   * @returns The point axis.
   */
  point: (anchor: number, options: UiPointAxisOptions = {}): UiPointAxis => {
    const { size, pivot } = {
      ...defaultUiPointAxisOptions,
      pivot: anchor,
      ...options,
    };

    return { kind: 'point', anchor, pivot, size };
  },

  /**
   * Creates a {@link UiStretchAxis}.
   * @param range - The normalized `[min, max]` span this axis anchors to within the parent's rect.
   * @param options - Options for configuring the axis. `margin` defaults to `0`; `pivot` defaults to `0.5`.
   * @returns The stretch axis.
   */
  stretch: (
    range: UiStretchAxisRange,
    options: UiStretchAxisOptions = {},
  ): UiStretchAxis => {
    const { margin, pivot } = { ...defaultUiStretchAxisOptions, ...options };

    return {
      kind: 'stretch',
      anchorMin: range.min,
      anchorMax: range.max,
      pivot,
      margin,
    };
  },
};

/**
 * Reads a {@link UiAxis}'s literal size (`UiPointAxis.size`) or margin
 * (`UiStretchAxis.margin`) - whichever field this axis's `kind` actually
 * has - without the caller needing to branch on `kind` itself. Useful for
 * code that treats an axis as an opaque "the number that isn't the
 * anchor/pivot" regardless of what it means, e.g. a layout group falling
 * back to an unmanaged child's own current size on an axis it doesn't
 * control.
 * @param axis - The axis to read.
 * @returns `axis.size` for a point axis, `axis.margin` for a stretch axis.
 */
export function uiAxisValue(axis: UiAxis): number {
  return axis.kind === 'point' ? axis.size : axis.margin;
}

/**
 * Returns a copy of `axis` with its size (`UiPointAxis.size`) or margin
 * (`UiStretchAxis.margin`) replaced by `value` - whichever field this
 * axis's `kind` actually has - leaving `anchor`(s)/`pivot` untouched. The
 * write-side counterpart to {@link uiAxisValue}.
 * @param axis - The axis to copy.
 * @param value - The new size (for a point axis) or margin (for a stretch axis).
 * @returns The updated axis.
 */
export function withUiAxisValue(axis: UiAxis, value: number): UiAxis {
  return axis.kind === 'point'
    ? { ...axis, size: value }
    : { ...axis, margin: value };
}

/**
 * Drives a {@link UiAxis} to a new normalized anchor position - `anchor` for
 * a `UiPointAxis`, `anchorMax` for a `UiStretchAxis` - mutating it in place
 * and leaving `pivot`/`size`/`margin`/`anchorMin` untouched. The mechanism
 * `createUiSliderEcsSystem`/`createUiProgressBarEcsSystem` use to slide a
 * handle along a track, or grow a fill span, from a normalized `[0, 1]`
 * value every tick.
 * @param axis - The axis to mutate.
 * @param value - The new normalized anchor position.
 */
export function driveUiAxis(axis: UiAxis, value: number): void {
  if (axis.kind === 'point') {
    axis.anchor = value;
  } else {
    axis.anchorMax = value;
  }
}
