// The two directions of a packed tile's transform bits. Not exported from
// the package. The bits move an image's content: what the untransformed
// image shows at `(u, v)` shows at `applyTileTransform(bits, (u, v))` in
// the transformed one. A renderer that applies the bits through texture
// coordinates needs the other direction: the quad's corner at `p` shows the
// content that moved there, so it samples the untransformed image at
// `invertTileTransform(bits, p)`. Code that moves something with the image
// (a collision shape) uses `applyTileTransform`. The two differ only for
// the two 90-degree turns, so mixing them up turns tiles the wrong way.

import { Vector2 } from '../../math/index.js';

/** Flip X in the bits `getTileTransformBits` returns. */
const flipX = 4;

/** Flip Y in the bits `getTileTransformBits` returns. */
const flipY = 2;

/** Transpose in the bits `getTileTransformBits` returns. */
const transpose = 1;

/**
 * Moves a point of a tile's image the way the transform bits move its
 * content: transpose, then flip X, then flip Y.
 * @param bits - The tile's transform bits, from `getTileTransformBits`.
 * @param point - The point, in the image's normalized coordinates
 * (`(0, 0)` top-left, `(1, 1)` bottom-right).
 * @param out - Receives the moved point. May be `point`.
 * @returns `out`.
 */
export function applyTileTransform(
  bits: number,
  point: Readonly<Vector2>,
  out: Vector2,
): Vector2 {
  let { x, y } = point;

  if (bits & transpose) {
    [x, y] = [y, x];
  }

  if (bits & flipX) {
    x = 1 - x;
  }

  if (bits & flipY) {
    y = 1 - y;
  }

  out.x = x;
  out.y = y;

  return out;
}

/**
 * Finds which point of a tile's untransformed image ends up at a point of
 * the transformed one, the inverse of {@link applyTileTransform}: the
 * flips are undone first, then the transpose. This is the texture
 * coordinate mapping a renderer uses.
 * @param bits - The tile's transform bits, from `getTileTransformBits`.
 * @param point - The point of the transformed image, in normalized
 * coordinates.
 * @param out - Receives the point of the untransformed image. May be
 * `point`.
 * @returns `out`.
 */
export function invertTileTransform(
  bits: number,
  point: Readonly<Vector2>,
  out: Vector2,
): Vector2 {
  let { x, y } = point;

  if (bits & flipY) {
    y = 1 - y;
  }

  if (bits & flipX) {
    x = 1 - x;
  }

  if (bits & transpose) {
    [x, y] = [y, x];
  }

  out.x = x;
  out.y = y;

  return out;
}
