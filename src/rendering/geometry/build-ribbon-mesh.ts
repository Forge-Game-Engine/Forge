import type { Vector2 } from '../../math/index.js';
import type { Color } from '../color.js';

/**
 * A point of the polyline a ribbon is built along by
 * {@link buildRibbonMesh}.
 */
export interface RibbonPoint {
  /**
   * The point's position. Y-up, in the space of the mesh that draws the
   * ribbon: its entity's local space, which is world space when the entity
   * has no position, rotation or scale of its own.
   */
  position: Vector2;

  /**
   * The ribbon's full width at this point, in the same units as `position`.
   * `0` or more.
   */
  width: number;

  /**
   * The ribbon's color at this point, straight (not premultiplied) alpha.
   * Red, green and blue can be above `1`, for bloom. A `Color`, or any
   * object with `r`, `g`, `b` and `a`, so a caller can reuse its own.
   */
  color: Pick<Color, 'r' | 'g' | 'b' | 'a'>;

  /**
   * How far along the line this point is, in the same units as `position`,
   * used for the texture's U coordinate. Usually grows (or shrinks)
   * monotonically from the first point to the last.
   */
  distance: number;
}

/**
 * How the texture's U coordinate runs along a ribbon:
 * - `'stretch'`: U runs from `0` at the first point to `1` at the last, so
 *   the texture is stretched once over the whole ribbon.
 * - `'tile'`: U is `distance / tileLength`, so the texture repeats every
 *   `tileLength` units.
 */
export type RibbonTextureMode = 'stretch' | 'tile';

/**
 * Options for {@link buildRibbonMesh}. Every field is required.
 */
export type RibbonMeshOptions =
  | {
      /** The texture is stretched once over the whole ribbon. */
      textureMode: 'stretch';

      /**
       * The longest a miter join can be, as a multiple of the ribbon's
       * width at that point, before it's beveled. `1` or more. `4` bevels
       * turns sharper than about 151°.
       */
      miterLimit: number;
    }
  | {
      /** The texture repeats every `tileLength` units of `distance`. */
      textureMode: 'tile';

      /**
       * The length of one repeat of the texture, in `distance`'s units.
       * Greater than `0`.
       */
      tileLength: number;

      /**
       * The longest a miter join can be, as a multiple of the ribbon's
       * width at that point, before it's beveled. `1` or more. `4` bevels
       * turns sharper than about 151°.
       */
      miterLimit: number;
    };

/**
 * The vertex data {@link buildRibbonMesh} writes, as a triangle strip. Each
 * array is replaced by a larger one when a call needs more room, so read
 * them from this object after every call.
 */
export interface RibbonMeshBuffers {
  /** `x, y` per vertex, Y-up, in the same space as the points. */
  positions: Float32Array;

  /**
   * `u, v` per vertex. U runs along the ribbon (see
   * {@link RibbonTextureMode}); V is `0` on the left edge (looking along
   * the line) and `1` on the right.
   */
  uvs: Float32Array;

  /** `r, g, b, a` per vertex, straight alpha. */
  colors: Float32Array;
}

/**
 * Points closer than this to the previous kept point are skipped: there's
 * no direction between them to offset the ribbon along. It's about a
 * hundredth of a pixel at the default camera.
 */
const minPointSpacing = 1e-4;

/**
 * A join whose normals sum to less than this is treated as an exact
 * reversal, which has no bisector to normalize. It's a turn within about
 * `1e-9` radians of 180°, far above the rounding error of adding two unit
 * vectors.
 */
const reversalThreshold = 1e-9;

/**
 * Returns the most vertices a ribbon of `pointCount` points can need: two
 * per end point and up to four per beveled interior point.
 * @param pointCount - The number of points, `2` or more.
 * @returns The vertex count.
 */
function getMaxVertexCount(pointCount: number): number {
  return 4 * pointCount - 4;
}

/**
 * Returns the smallest power of two at least `vertexCount`, so buffers that
 * keep growing are reallocated a logarithmic number of times.
 * @param vertexCount - The number of vertices the buffers have to hold.
 * @returns The number of vertices to allocate.
 */
function getVertexCapacity(vertexCount: number): number {
  return 2 ** Math.ceil(Math.log2(vertexCount));
}

/**
 * Creates zeroed buffers holding `vertexCapacity` vertices.
 * @param vertexCapacity - The number of vertices each array holds.
 * @returns The buffers.
 */
function allocateBuffers(vertexCapacity: number): RibbonMeshBuffers {
  return {
    positions: new Float32Array(vertexCapacity * 2),
    uvs: new Float32Array(vertexCapacity * 2),
    colors: new Float32Array(vertexCapacity * 4),
  };
}

/**
 * Creates buffers with room for a ribbon of `pointCapacity` points: the
 * `4 · pointCapacity − 4` vertices such a ribbon can need, rounded up to a
 * power of two. Each array holds that many vertices (`positions` and `uvs`
 * 2 floats each, `colors` 4), all zero.
 * @param pointCapacity - The most points the caller expects to pass. An
 * integer, `2` or more.
 * @returns The buffers.
 * @throws An error if `pointCapacity` isn't an integer of at least `2`.
 */
export function createRibbonMeshBuffers(
  pointCapacity: number,
): RibbonMeshBuffers {
  if (!Number.isInteger(pointCapacity) || pointCapacity < 2) {
    throw new Error(
      `Unable to create ribbon mesh buffers for a point capacity of "${pointCapacity}", it must be an integer of at least 2.`,
    );
  }

  return allocateBuffers(getVertexCapacity(getMaxVertexCount(pointCapacity)));
}

/**
 * Throws if the options or any point's width are out of range.
 * @param points - The ribbon's points.
 * @param options - The ribbon's options.
 * @throws An error naming the value that's out of range.
 */
function validate(
  points: readonly RibbonPoint[],
  options: RibbonMeshOptions,
): void {
  if (Number.isNaN(options.miterLimit) || options.miterLimit < 1) {
    throw new Error(
      `Unable to build a ribbon mesh with a miter limit of "${options.miterLimit}", it must be 1 or more.`,
    );
  }

  if (
    options.textureMode === 'tile' &&
    !(Number.isFinite(options.tileLength) && options.tileLength > 0)
  ) {
    throw new Error(
      `Unable to build a ribbon mesh with a tile length of "${options.tileLength}", it must be a finite number greater than 0.`,
    );
  }

  for (let i = 0; i < points.length; i++) {
    const { width } = points[i];

    if (!Number.isFinite(width) || width < 0) {
      throw new Error(
        `Unable to build a ribbon mesh with a width of "${width}" at point ${i}, it must be a finite number of 0 or more.`,
      );
    }
  }
}

/**
 * Returns whether two points are too close to have a direction between
 * them.
 * @param a - The first point.
 * @param b - The second point.
 * @returns `true` if they're closer than {@link minPointSpacing}.
 */
function isTooClose(a: RibbonPoint, b: RibbonPoint): boolean {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;

  return dx * dx + dy * dy < minPointSpacing * minPointSpacing;
}

/**
 * Returns the index of the next point to keep after the kept point at
 * `from`. A point in between is kept when it's far enough from both the
 * previous kept point and the last point, so the last point is always kept
 * and is never too close to the point before it.
 * @param points - The ribbon's points.
 * @param from - The index of the previous kept point.
 * @returns The index of the next kept point, the last index if none in
 * between is kept.
 */
function getNextKeptIndex(
  points: readonly RibbonPoint[],
  from: number,
): number {
  const lastIndex = points.length - 1;

  for (let i = from + 1; i < lastIndex; i++) {
    if (
      !isTooClose(points[from], points[i]) &&
      !isTooClose(points[i], points[lastIndex])
    ) {
      return i;
    }
  }

  return lastIndex;
}

/**
 * Writes one vertex. Every point writes its vertices in left-right pairs
 * starting at an even index, so a vertex's V (`0` on the left edge, `1` on
 * the right) is its index's parity.
 * @param out - The buffers to write into.
 * @param vertexIndex - The vertex's index.
 * @param x - The vertex's x position.
 * @param y - The vertex's y position.
 * @param u - The vertex's U texture coordinate.
 * @param color - The vertex's color.
 */
function writeVertex(
  out: RibbonMeshBuffers,
  vertexIndex: number,
  x: number,
  y: number,
  u: number,
  color: RibbonPoint['color'],
): void {
  out.positions[vertexIndex * 2] = x;
  out.positions[vertexIndex * 2 + 1] = y;
  out.uvs[vertexIndex * 2] = u;
  out.uvs[vertexIndex * 2 + 1] = vertexIndex % 2;
  out.colors[vertexIndex * 4] = color.r;
  out.colors[vertexIndex * 4 + 1] = color.g;
  out.colors[vertexIndex * 4 + 2] = color.b;
  out.colors[vertexIndex * 4 + 3] = color.a;
}

/**
 * Writes an end point's pair of vertices, offset along the normal of the
 * segment from `from` to `to` (the segment's direction turned +90°, so it
 * points left of travel).
 * @param out - The buffers to write into.
 * @param vertexIndex - The index of the pair's left vertex.
 * @param point - The end point.
 * @param from - The segment's start.
 * @param to - The segment's end.
 * @param u - The point's U texture coordinate.
 * @returns The index of the next vertex.
 */
function writeEnd(
  out: RibbonMeshBuffers,
  vertexIndex: number,
  point: RibbonPoint,
  from: RibbonPoint,
  to: RibbonPoint,
  u: number,
): number {
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const halfWidthOverLength = point.width / 2 / Math.sqrt(dx * dx + dy * dy);
  const offsetX = -dy * halfWidthOverLength;
  const offsetY = dx * halfWidthOverLength;
  const { x, y } = point.position;

  writeVertex(out, vertexIndex, x + offsetX, y + offsetY, u, point.color);
  writeVertex(out, vertexIndex + 1, x - offsetX, y - offsetY, u, point.color);

  return vertexIndex + 2;
}

/**
 * Returns how far the inner vertex of a join sits from the point along the
 * miter direction: the miter length, but never so far that the vertex
 * passes the middle of either neighboring segment, where the inner
 * vertices of two neighboring joins would cross and fold the strip.
 * @param halfWidth - Half the ribbon's width at the point.
 * @param cosHalfTurn - The cosine of half the turn, `0` at a reversal.
 * @param sinHalfTurn - The sine of half the turn.
 * @param shortestSegment - The length of the shorter neighboring segment.
 * @returns The inner vertex's distance from the point.
 */
function getInnerOffset(
  halfWidth: number,
  cosHalfTurn: number,
  sinHalfTurn: number,
  shortestSegment: number,
): number {
  if (halfWidth === 0) {
    return 0;
  }

  const miterOffset =
    cosHalfTurn > 0 ? halfWidth / cosHalfTurn : Number.POSITIVE_INFINITY;

  if (sinHalfTurn > 0) {
    return Math.min(miterOffset, shortestSegment / (2 * sinHalfTurn));
  }

  return miterOffset;
}

/**
 * Writes an interior point's vertices: a mitered pair, or two pairs that
 * bevel the outer side when the miter would be longer than `miterLimit`
 * times the width. Both bevel pairs share the inner vertex, so the strip
 * gets the bevel's wedge and one zero-area triangle.
 * @param out - The buffers to write into.
 * @param vertexIndex - The index of the first pair's left vertex.
 * @param previous - The previous kept point.
 * @param point - The point.
 * @param next - The next kept point.
 * @param u - The point's U texture coordinate.
 * @param miterLimit - The longest a miter can be, as a multiple of the
 * width.
 * @returns The index of the next vertex.
 */
function writeJoin(
  out: RibbonMeshBuffers,
  vertexIndex: number,
  previous: RibbonPoint,
  point: RibbonPoint,
  next: RibbonPoint,
  u: number,
  miterLimit: number,
): number {
  const { x, y } = point.position;
  const { color } = point;
  const halfWidth = point.width / 2;

  const inX = x - previous.position.x;
  const inY = y - previous.position.y;
  const inLength = Math.sqrt(inX * inX + inY * inY);
  const outX = next.position.x - x;
  const outY = next.position.y - y;
  const outLength = Math.sqrt(outX * outX + outY * outY);

  // The segments' directions, and their normals turned +90°.
  const d0x = inX / inLength;
  const d0y = inY / inLength;
  const d1x = outX / outLength;
  const d1y = outY / outLength;
  const ax = -d0y;
  const ay = d0x;
  const bx = -d1y;
  const by = d1x;

  // For unit normals at an angle θ, |a + b| = 2cos(θ/2) and
  // |a − b| = 2sin(θ/2). Reading the half angle from these lengths keeps
  // each accurate where it's small, and they can't go negative or NaN the
  // way sqrt((1 ± dot(a, b)) / 2) can when the dot product rounds past ±1.
  const sumX = ax + bx;
  const sumY = ay + by;
  const bisectorLength = Math.sqrt(sumX * sumX + sumY * sumY);
  const differenceX = ax - bx;
  const differenceY = ay - by;
  let cosHalfTurn = bisectorLength / 2;
  let sinHalfTurn =
    Math.sqrt(differenceX * differenceX + differenceY * differenceY) / 2;

  // A left turn (positive cross product) puts the inner corner on the
  // left; a right turn on the right. A straight line or an exact reversal
  // has no turn and uses the left.
  const turn = d0x * d1y - d0y * d1x;
  const innerSign = turn < 0 ? -1 : 1;
  const outerSign = -innerSign;

  let miterX: number;
  let miterY: number;

  if (bisectorLength < reversalThreshold) {
    // The line turns back on itself, so there's no bisector. Point the
    // miter so the inner vertex lands behind the point on the incoming
    // segment, where it tends to as the turn approaches 180° from either
    // side, and bevel the outer side.
    miterX = -innerSign * d0x;
    miterY = -innerSign * d0y;
    cosHalfTurn = 0;
    sinHalfTurn = 1;
  } else {
    miterX = sumX / bisectorLength;
    miterY = sumY / bisectorLength;
  }

  const innerOffset =
    innerSign *
    getInnerOffset(
      halfWidth,
      cosHalfTurn,
      sinHalfTurn,
      Math.min(inLength, outLength),
    );
  const innerX = x + miterX * innerOffset;
  const innerY = y + miterY * innerOffset;

  // The inner vertex goes in the pair's left slot (index parity 0) for a
  // left turn and its right slot for a right turn; the outer vertex takes
  // the other one.
  const innerSlot = innerSign > 0 ? 0 : 1;
  const outerSlot = 1 - innerSlot;

  // 1 / cos(half the turn) is the miter's length as a multiple of the
  // width, the ratio SVG's stroke-miterlimit compares against.
  if (cosHalfTurn * miterLimit >= 1) {
    const outerOffset = (outerSign * halfWidth) / cosHalfTurn;

    writeVertex(out, vertexIndex + innerSlot, innerX, innerY, u, color);
    writeVertex(
      out,
      vertexIndex + outerSlot,
      x + miterX * outerOffset,
      y + miterY * outerOffset,
      u,
      color,
    );

    return vertexIndex + 2;
  }

  const outerOffset = outerSign * halfWidth;

  writeVertex(out, vertexIndex + innerSlot, innerX, innerY, u, color);
  writeVertex(
    out,
    vertexIndex + outerSlot,
    x + ax * outerOffset,
    y + ay * outerOffset,
    u,
    color,
  );
  writeVertex(out, vertexIndex + 2 + innerSlot, innerX, innerY, u, color);
  writeVertex(
    out,
    vertexIndex + 2 + outerSlot,
    x + bx * outerOffset,
    y + by * outerOffset,
    u,
    color,
  );

  return vertexIndex + 4;
}

/**
 * Returns a point's U texture coordinate.
 * @param distance - The point's distance along the line.
 * @param origin - The distance at which U is `0`.
 * @param span - The distance over which U grows by `1`; `0` makes every U
 * `0`.
 * @returns The U coordinate.
 */
function getU(distance: number, origin: number, span: number): number {
  if (span === 0) {
    return 0;
  }

  return (distance - origin) / span;
}

/**
 * Builds a ribbon along `points`: a strip of triangles that follows the
 * polyline with each point's width and color, for a `Geometry` with the
 * `'triangleStrip'` topology.
 *
 * Each point is offset to both sides along its join's miter, scaled so the
 * ribbon keeps its width around corners. A turn whose miter would be longer
 * than `miterLimit` times the width is beveled instead, so sharp turns
 * don't spike, and the inner side of a turn never reaches past the middle
 * of either neighboring segment, so a curve tighter than half the width
 * doesn't fold over itself. The first and last points end the ribbon flat,
 * across their segment. A point closer than `1e-4` units to the previous
 * kept point is skipped; the first and last points are always kept.
 *
 * Writes positions, UVs and straight-alpha colors into `out`, replacing its
 * arrays with larger ones (to a power of two vertices) only when they can't
 * hold `4 · points.length − 4` vertices, so a call allocates nothing once
 * they're big enough.
 * @param points - The polyline, in order along the ribbon.
 * @param options - How the texture runs along the ribbon and when joins are
 * beveled.
 * @param out - The buffers to write into, usually from
 * {@link createRibbonMeshBuffers}.
 * @returns The number of vertices written; `0` when fewer than two of the
 * points are distinct.
 * @throws An error if a width is negative or not finite, `miterLimit` is
 * below `1`, or `tileLength` isn't a finite number greater than `0`.
 */
export function buildRibbonMesh(
  points: readonly RibbonPoint[],
  options: RibbonMeshOptions,
  out: RibbonMeshBuffers,
): number {
  validate(points, options);

  if (points.length < 2) {
    return 0;
  }

  const lastIndex = points.length - 1;
  const first = points[0];
  const last = points[lastIndex];
  let currentIndex = getNextKeptIndex(points, 0);

  if (currentIndex === lastIndex && isTooClose(first, last)) {
    return 0;
  }

  const vertexCount = getMaxVertexCount(points.length);

  if (out.positions.length < vertexCount * 2) {
    Object.assign(out, allocateBuffers(getVertexCapacity(vertexCount)));
  }

  let uOrigin = first.distance;
  let uSpan = last.distance - first.distance;

  if (options.textureMode === 'tile') {
    // Rebase by whole tiles, which a repeating texture can't tell apart, so
    // U stays small and precise in a Float32Array however far the
    // distances have grown.
    uOrigin =
      Math.floor(first.distance / options.tileLength) * options.tileLength;
    uSpan = options.tileLength;
  }

  let previousIndex = 0;
  let vertexIndex = writeEnd(
    out,
    0,
    first,
    first,
    points[currentIndex],
    getU(first.distance, uOrigin, uSpan),
  );

  while (currentIndex !== lastIndex) {
    const nextIndex = getNextKeptIndex(points, currentIndex);
    const current = points[currentIndex];

    vertexIndex = writeJoin(
      out,
      vertexIndex,
      points[previousIndex],
      current,
      points[nextIndex],
      getU(current.distance, uOrigin, uSpan),
      options.miterLimit,
    );

    previousIndex = currentIndex;
    currentIndex = nextIndex;
  }

  return writeEnd(
    out,
    vertexIndex,
    last,
    points[previousIndex],
    last,
    getU(last.distance, uOrigin, uSpan),
  );
}
