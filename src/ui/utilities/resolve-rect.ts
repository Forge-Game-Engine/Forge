import { Rect } from '../../math/index.js';
import { RectTransformEcsComponent } from '../components/rect-transform-component.js';

/**
 * Resolves a `RectTransformEcsComponent`'s rect against its parent's
 * already-resolved rect. Pure - takes no `EcsWorld`/entity, reads no other
 * state - so the entire anchor/pivot/stretch surface is unit-testable in
 * isolation.
 *
 * Two regimes fall out of the same formula depending on whether
 * `anchorMin`/`anchorMax` coincide: a **point anchor** (`anchorMin ==
 * anchorMax`) keeps `sizeDelta` as the element's literal size and moves with
 * the anchor; a **stretch anchor** (`anchorMin != anchorMax`) resizes with
 * the parent, with `sizeDelta` acting as a margin.
 * @param parentRect - The parent's already-resolved rect, in UI world space.
 * @param rectTransform - The rect transform to resolve.
 * @returns The resolved rect, in the same UI world space as `parentRect`.
 */
export function resolveRect(
  parentRect: Rect,
  rectTransform: RectTransformEcsComponent,
): Rect {
  const { anchorMin, anchorMax, pivot, anchoredPosition, sizeDelta } =
    rectTransform;
  const parentWidth = parentRect.max.x - parentRect.min.x;
  const parentHeight = parentRect.max.y - parentRect.min.y;

  const anchorRectMinX = parentRect.min.x + anchorMin.x * parentWidth;
  const anchorRectMinY = parentRect.min.y + anchorMin.y * parentHeight;
  const anchorRectMaxX = parentRect.min.x + anchorMax.x * parentWidth;
  const anchorRectMaxY = parentRect.min.y + anchorMax.y * parentHeight;

  const anchorRectSizeX = anchorRectMaxX - anchorRectMinX;
  const anchorRectSizeY = anchorRectMaxY - anchorRectMinY;

  const width = anchorRectSizeX + sizeDelta.x;
  const height = anchorRectSizeY + sizeDelta.y;

  const referencePointX = anchorRectMinX + anchorRectSizeX * pivot.x;
  const referencePointY = anchorRectMinY + anchorRectSizeY * pivot.y;

  const pivotPositionX = referencePointX + anchoredPosition.x;
  const pivotPositionY = referencePointY + anchoredPosition.y;

  const minX = pivotPositionX - width * pivot.x;
  const minY = pivotPositionY - height * pivot.y;

  return {
    min: { x: minX, y: minY },
    max: { x: minX + width, y: minY + height },
  };
}
