import { Vector2 } from '../../math/index.js';
import { UiTransformEcsComponent } from '../components/ui-transform-component.js';

/**
 * Tests whether a point in UI screen-space lies within a UI element's hit area.
 *
 * The test is performed in the element's **local** [0,1]×[0,1] space by
 * inverting the element's `worldMatrix`. This correctly handles rotated and
 * scaled elements — unlike a simple AABB check against `resolvedRect`.
 *
 * Clip rect (if set) is checked first in screen-space as a fast pre-rejection.
 *
 * @param point - The point to test, in UI screen-space CSS pixels.
 * @param transform - The element's transform component.
 * @param hitPadding - Extra padding in CSS pixels applied on all sides. Default `0`.
 * @returns `true` if the point is inside the (optionally padded) element hit area.
 */
export function pointInUiElement(
  point: Vector2,
  transform: UiTransformEcsComponent,
  hitPadding: number = 0,
): boolean {
  // Fast pre-rejection: point must be inside the propagated clip rect.
  if (transform.clipRect != null) {
    if (!transform.clipRect.containsPoint(point)) {
      return false;
    }
  }

  // Transform point to element local [0,1]×[0,1] space via inverse worldMatrix.
  // worldMatrix maps local → screen:  screen = M * local
  // Column-major layout (m[col*3 + row]):
  //   | m[0]  m[3]  m[6] |   | a  c  tx |
  //   | m[1]  m[4]  m[7] | = | b  d  ty |
  //   | 0     0     1    |   | 0  0   1 |
  const m = transform.worldMatrix.matrix;
  const a = m[0];
  const b = m[1];
  const c = m[3];
  const d = m[4];
  const tx = m[6];
  const ty = m[7];

  const det = a * d - b * c;

  if (Math.abs(det) < 1e-10) {
    return false;
  }

  // Inverse affine: local = M^{-1} * screen
  const dx = point.x - tx;
  const dy = point.y - ty;

  const localX = (d * dx - c * dy) / det;
  const localY = (-b * dx + a * dy) / det;

  // Convert hitPadding from CSS pixels to normalised local-space units.
  const w = transform.resolvedRect.size.x;
  const h = transform.resolvedRect.size.y;
  const padX = w > 0 ? hitPadding / w : 0;
  const padY = h > 0 ? hitPadding / h : 0;

  return (
    localX >= -padX &&
    localX <= 1 + padX &&
    localY >= -padY &&
    localY <= 1 + padY
  );
}
