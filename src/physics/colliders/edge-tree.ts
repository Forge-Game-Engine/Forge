import { Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';

/**
 * The most items a leaf holds. Smaller leaves cull more precisely but make
 * a deeper tree; four keeps a leaf's own item tests about as cheap as the
 * node tests it saves.
 */
const maxLeafSize = 4;

/**
 * Marks a node as a leaf in {@link EdgeTree}'s right-child array.
 */
const leafMarker = -1;

/**
 * A static bounding-volume tree over a fixed set of item bounds (a chain
 * shape's edges), built once by splitting at the median, so a query visits
 * only the items near a box or segment instead of every item.
 *
 * Nodes are stored depth-first in flat typed arrays: a node's left child is
 * the node right after it, and its right child's index is stored. A query
 * allocates only its result.
 */
export class EdgeTree {
  /**
   * Each item's bounds, four numbers per item: `minX`, `minY`, `maxX`,
   * `maxY`.
   */
  private readonly _itemBounds: Float64Array;

  /**
   * Each node's bounds, laid out like {@link _itemBounds}.
   */
  private readonly _nodeBounds: Float64Array;

  /**
   * Each node's right child, or {@link leafMarker} for a leaf.
   */
  private readonly _nodeRight: Int32Array;

  /**
   * A leaf's first entry in {@link _order}.
   */
  private readonly _nodeFirst: Int32Array;

  /**
   * How many entries of {@link _order} a leaf holds.
   */
  private readonly _nodeCount: Int32Array;

  /**
   * The item indices, grouped so each leaf's items are contiguous.
   */
  private readonly _order: Int32Array;

  /**
   * The number of items in the tree.
   */
  private readonly _itemCount: number;

  /**
   * Builds a tree over the given item bounds.
   * @param itemBounds - One bounding box per item; an item's index in the
   * array is the index queries return for it.
   */
  constructor(itemBounds: readonly Aabb[]) {
    const itemCount = itemBounds.length;
    // A tree whose leaves each hold at least one item has at most
    // `2 * itemCount - 1` nodes.
    const nodeCapacity = Math.max(1, 2 * itemCount - 1);

    this._itemCount = itemCount;
    this._itemBounds = new Float64Array(4 * itemCount);
    this._nodeBounds = new Float64Array(4 * nodeCapacity);
    this._nodeRight = new Int32Array(nodeCapacity);
    this._nodeFirst = new Int32Array(nodeCapacity);
    this._nodeCount = new Int32Array(nodeCapacity);
    this._order = new Int32Array(itemCount);

    for (let i = 0; i < itemCount; i++) {
      const bounds = itemBounds[i];

      this._itemBounds[4 * i] = bounds.min.x;
      this._itemBounds[4 * i + 1] = bounds.min.y;
      this._itemBounds[4 * i + 2] = bounds.max.x;
      this._itemBounds[4 * i + 3] = bounds.max.y;
      this._order[i] = i;
    }

    if (itemCount > 0) {
      this._build(0, 0, itemCount);
    }
  }

  /**
   * Finds every item whose bounds overlap a box (touching counts).
   * @param bounds - The box to test, in the items' space. Its bounds may be
   * infinite.
   * @returns The overlapping items' indices, ascending.
   */
  public queryBounds(bounds: Aabb): number[] {
    const { min, max } = bounds;

    return this._query((source, offset) =>
      boxesOverlap(source, offset, min.x, min.y, max.x, max.y),
    );
  }

  /**
   * Finds every item whose bounds the segment from `start` to `end`
   * reaches (touching counts).
   * @param start - The segment's start, in the items' space.
   * @param end - The segment's end, in the items' space.
   * @returns The reached items' indices, ascending.
   */
  public querySegment(start: Vector2, end: Vector2): number[] {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    return this._query((source, offset) =>
      segmentReachesBox(source, offset, start.x, start.y, deltaX, deltaY),
    );
  }

  /**
   * Walks the tree, descending into every node `overlaps` accepts and
   * collecting every item in a reached leaf that it accepts too.
   */
  private _query(
    overlaps: (source: Float64Array, offset: number) => boolean,
  ): number[] {
    const result: number[] = [];

    if (this._itemCount === 0) {
      return result;
    }

    const stack = [0];

    while (stack.length > 0) {
      const node = stack.pop() ?? 0;

      if (!overlaps(this._nodeBounds, 4 * node)) {
        continue;
      }

      const right = this._nodeRight[node];

      if (right !== leafMarker) {
        stack.push(right, node + 1);

        continue;
      }

      const first = this._nodeFirst[node];
      const last = first + this._nodeCount[node];

      for (let i = first; i < last; i++) {
        const item = this._order[i];

        if (overlaps(this._itemBounds, 4 * item)) {
          result.push(item);
        }
      }
    }

    return result.sort((a, b) => a - b);
  }

  /**
   * Builds the subtree over `_order[start..end)` at `node`, depth-first.
   * @returns The index of the next free node.
   */
  private _build(node: number, start: number, end: number): number {
    this._fitNodeBounds(node, start, end);

    if (end - start <= maxLeafSize) {
      this._nodeRight[node] = leafMarker;
      this._nodeFirst[node] = start;
      this._nodeCount[node] = end - start;

      return node + 1;
    }

    this._partitionAtMedian(start, end);

    const middle = (start + end) >> 1;
    const right = this._build(node + 1, start, middle);

    this._nodeRight[node] = right;

    return this._build(right, middle, end);
  }

  /**
   * Sets a node's bounds to the union of its items' bounds.
   */
  private _fitNodeBounds(node: number, start: number, end: number): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = start; i < end; i++) {
      const offset = 4 * this._order[i];

      minX = Math.min(minX, this._itemBounds[offset]);
      minY = Math.min(minY, this._itemBounds[offset + 1]);
      maxX = Math.max(maxX, this._itemBounds[offset + 2]);
      maxY = Math.max(maxY, this._itemBounds[offset + 3]);
    }

    this._nodeBounds[4 * node] = minX;
    this._nodeBounds[4 * node + 1] = minY;
    this._nodeBounds[4 * node + 2] = maxX;
    this._nodeBounds[4 * node + 3] = maxY;
  }

  /**
   * Sorts `_order[start..end)` by the items' centers along the axis their
   * centers spread furthest on, so that splitting at the middle splits at
   * the median.
   */
  private _partitionAtMedian(start: number, end: number): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = start; i < end; i++) {
      const centerX = this._center(this._order[i], 0);
      const centerY = this._center(this._order[i], 1);

      minX = Math.min(minX, centerX);
      minY = Math.min(minY, centerY);
      maxX = Math.max(maxX, centerX);
      maxY = Math.max(maxY, centerY);
    }

    const axis = maxX - minX >= maxY - minY ? 0 : 1;
    const sorted = Array.from(this._order.subarray(start, end)).sort(
      (a, b) => this._center(a, axis) - this._center(b, axis) || a - b,
    );

    this._order.set(sorted, start);
  }

  /**
   * The center of an item's bounds along one axis (`0` for x, `1` for y).
   */
  private _center(item: number, axis: number): number {
    const offset = 4 * item + axis;

    return (this._itemBounds[offset] + this._itemBounds[offset + 2]) / 2;
  }
}

function boxesOverlap(
  source: Float64Array,
  offset: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  return (
    source[offset] <= maxX &&
    source[offset + 2] >= minX &&
    source[offset + 1] <= maxY &&
    source[offset + 3] >= minY
  );
}

/**
 * Tests whether the segment from `(startX, startY)` to
 * `(startX + deltaX, startY + deltaY)` reaches a box, by clipping the
 * segment's parameter range against the box's x and y slabs.
 */
function segmentReachesBox(
  source: Float64Array,
  offset: number,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
): boolean {
  const xRange = clipToSlab(
    startX,
    deltaX,
    source[offset],
    source[offset + 2],
    0,
    1,
  );

  if (xRange === null) {
    return false;
  }

  return (
    clipToSlab(
      startY,
      deltaY,
      source[offset + 1],
      source[offset + 3],
      xRange.tMin,
      xRange.tMax,
    ) !== null
  );
}

/**
 * Narrows a segment's parameter range `[tMin, tMax]` to the part inside
 * the slab `min <= start + t * delta <= max`.
 * @returns The narrowed range, or `null` if none of it is inside.
 */
function clipToSlab(
  start: number,
  delta: number,
  min: number,
  max: number,
  tMin: number,
  tMax: number,
): { tMin: number; tMax: number } | null {
  if (delta === 0) {
    return start < min || start > max ? null : { tMin, tMax };
  }

  const tA = (min - start) / delta;
  const tB = (max - start) / delta;
  const narrowedMin = Math.max(tMin, Math.min(tA, tB));
  const narrowedMax = Math.min(tMax, Math.max(tA, tB));

  return narrowedMin > narrowedMax
    ? null
    : { tMin: narrowedMin, tMax: narrowedMax };
}
