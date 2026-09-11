import { Rect } from '../../math/index.js';
import { RectTransformEcsComponent } from '../components/rect-transform-component.js';
import { UiAxis } from '../types/ui-axis.js';

/**
 * Resolves one axis (`x` or `y`) against the parent's already-resolved span
 * on that axis. A `UiPointAxis`'s `anchorMin`/`anchorMax` coincide at
 * `anchor`, so `anchorSpan` collapses to `0` and `size` falls out as the
 * element's literal size; a `UiStretchAxis`'s span scales with the parent,
 * with `margin` added to it - the same formula covers both regimes.
 *
 * `size`/`margin` is converted from `pixelsPerUnit` first when the axis's own
 * `sizeUnit`/`marginUnit` is `'screenPixels'` - see {@link UiAxisSizeUnit}.
 */
function resolveAxis(
  axis: UiAxis,
  parentMin: number,
  parentSize: number,
  anchoredPositionOnAxis: number,
  pixelsPerUnit: number,
): { min: number; max: number } {
  const anchorMin = axis.kind === 'point' ? axis.anchor : axis.anchorMin;
  const anchorMax = axis.kind === 'point' ? axis.anchor : axis.anchorMax;

  const anchorSpanMin = parentMin + anchorMin * parentSize;
  const anchorSpanMax = parentMin + anchorMax * parentSize;
  const anchorSpanSize = anchorSpanMax - anchorSpanMin;

  const rawValue = axis.kind === 'point' ? axis.size : axis.margin;
  const unit = axis.kind === 'point' ? axis.sizeUnit : axis.marginUnit;
  const value = unit === 'screenPixels' ? rawValue / pixelsPerUnit : rawValue;

  const size = axis.kind === 'point' ? value : anchorSpanSize + value;

  const referencePoint = anchorSpanMin + anchorSpanSize * axis.pivot;
  const pivotPosition = referencePoint + anchoredPositionOnAxis;

  const min = pivotPosition - size * axis.pivot;

  return { min, max: min + size };
}

/**
 * Resolves a `RectTransformEcsComponent`'s rect against its parent's
 * already-resolved rect. Pure - takes no `EcsWorld`/entity, reads no other
 * state - so the entire anchor/pivot/stretch surface is unit-testable in
 * isolation.
 *
 * `x` and `y` are resolved independently by {@link resolveAxis}, since each
 * is its own `UiPointAxis` (literal size, moves with the anchor) or
 * `UiStretchAxis` (resizes with the parent, `margin` added to the anchored
 * span) - a mixed anchor (e.g. `UiAnchor.stretchTop`, stretched
 * horizontally but point-anchored vertically) simply resolves each axis
 * under its own rule.
 * @param parentRect - The parent's already-resolved rect, in UI world space.
 * @param rectTransform - The rect transform to resolve.
 * @param pixelsPerUnit - The owning canvas's live reference-pixel-to-screen-pixel
 * ratio (see `calculatePixelsPerUnit`), used to convert a `'screenPixels'`-unit
 * `size`/`margin` (see {@link UiAxisSizeUnit}) into reference pixels. Defaults
 * to `1` - a neutral value under which `'screenPixels'` behaves exactly like
 * `'referencePixels'` - for callers that don't track a live ratio.
 * @returns The resolved rect, in the same UI world space as `parentRect`.
 */
export function resolveRect(
  parentRect: Rect,
  rectTransform: RectTransformEcsComponent,
  pixelsPerUnit = 1,
): Rect {
  const { x, y, anchoredPosition } = rectTransform;
  const parentWidth = parentRect.max.x - parentRect.min.x;
  const parentHeight = parentRect.max.y - parentRect.min.y;

  const resolvedX = resolveAxis(
    x,
    parentRect.min.x,
    parentWidth,
    anchoredPosition.x,
    pixelsPerUnit,
  );
  const resolvedY = resolveAxis(
    y,
    parentRect.min.y,
    parentHeight,
    anchoredPosition.y,
    pixelsPerUnit,
  );

  return {
    min: { x: resolvedX.min, y: resolvedY.min },
    max: { x: resolvedX.max, y: resolvedY.max },
  };
}
