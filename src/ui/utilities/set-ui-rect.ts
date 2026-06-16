import { UiTransformEcsComponent } from '../components/ui-transform-component.js';

/**
 * A simple axis-aligned rect relative to an anchor point.
 */
export interface UiRect {
  /** Horizontal distance from the anchor point to the element's left edge. */
  x: number;
  /** Vertical distance from the anchor point to the element's top edge. */
  y: number;
  /** Width of the element in pixels. */
  width: number;
  /** Height of the element in pixels. */
  height: number;
}

/**
 * Converts a simple pixel rect into `offsetMin`/`offsetMax` on a
 * {@link UiTransformEcsComponent}.
 *
 * Intended for use with *point anchors* (`anchorMin === anchorMax`), where
 * `x`/`y` are the position of the element's top-left corner relative to the
 * anchor point, and `width`/`height` are the element's pixel dimensions.
 *
 * @param transform - The transform to update.
 * @param rect - The desired rect relative to the anchor.
 */
export function setUiRect(
  transform: UiTransformEcsComponent,
  rect: UiRect,
): void {
  transform.offsetMin.x = rect.x;
  transform.offsetMin.y = rect.y;
  transform.offsetMax.x = rect.x + rect.width;
  transform.offsetMax.y = rect.y + rect.height;
}
