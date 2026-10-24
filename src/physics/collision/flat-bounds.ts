/**
 * Whether the box stored at `offset` in `bounds` (four numbers: `minX`,
 * `minY`, `maxX`, `maxY`) overlaps the given box. Touching counts.
 * @param bounds - Packed boxes, four numbers each.
 * @param offset - The index of the box's `minX` in `bounds`.
 * @param minX - The other box's smallest x.
 * @param minY - The other box's smallest y.
 * @param maxX - The other box's largest x.
 * @param maxY - The other box's largest y.
 * @returns `true` if the boxes overlap or touch.
 */
export function boxesOverlap(
  bounds: Float64Array,
  offset: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  return (
    bounds[offset] <= maxX &&
    bounds[offset + 2] >= minX &&
    bounds[offset + 1] <= maxY &&
    bounds[offset + 3] >= minY
  );
}

/**
 * Whether the segment `start + t * delta`, for `t` in `[0, maxFraction]`,
 * reaches the box stored at `offset` in `bounds` (touching counts), by
 * clipping `t` against the box's x and y slabs. Allocates nothing.
 * @param bounds - Packed boxes, four numbers each: `minX`, `minY`, `maxX`,
 * `maxY`.
 * @param offset - The index of the box's `minX` in `bounds`.
 * @param startX - The segment's start x.
 * @param startY - The segment's start y.
 * @param deltaX - The segment's x extent, `endX - startX`.
 * @param deltaY - The segment's y extent, `endY - startY`.
 * @param maxFraction - How much of the segment to test, from `0` (only the
 * start) to `1` (all of it).
 * @returns `true` if the tested part of the segment reaches the box.
 */
export function segmentReachesBox(
  bounds: Float64Array,
  offset: number,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
  maxFraction: number,
): boolean {
  let tMin = 0;
  let tMax = maxFraction;

  // A segment parallel to a slab is inside it everywhere or nowhere; testing
  // that directly also avoids dividing by zero.
  if (deltaX === 0) {
    if (startX < bounds[offset] || startX > bounds[offset + 2]) {
      return false;
    }
  } else {
    const tA = (bounds[offset] - startX) / deltaX;
    const tB = (bounds[offset + 2] - startX) / deltaX;

    tMin = Math.max(tMin, Math.min(tA, tB));
    tMax = Math.min(tMax, Math.max(tA, tB));

    if (tMin > tMax) {
      return false;
    }
  }

  if (deltaY === 0) {
    return startY >= bounds[offset + 1] && startY <= bounds[offset + 3];
  }

  const tA = (bounds[offset + 1] - startY) / deltaY;
  const tB = (bounds[offset + 3] - startY) / deltaY;

  return Math.max(tMin, Math.min(tA, tB)) <= Math.min(tMax, Math.max(tA, tB));
}
