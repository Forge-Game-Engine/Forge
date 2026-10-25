import { Vector2 } from '../../math/index.js';
import { boxesOverlap, segmentReachesBox } from '../collision/flat-bounds.js';
import { Aabb } from '../types/aabb.js';

/**
 * How far, in world units, each side of a proxy's box is grown when a
 * {@link DynamicAabbTree} stores it. The stored box is the proxy's "fat"
 * box: while the shape's tight box stays inside it,
 * {@link DynamicAabbTree.moveProxy} changes nothing, so a shape that rests,
 * jitters or moves less than this from where its box was last stored costs
 * no tree work.
 *
 * Forge's physics is scaled in meters (gravity defaults to `9.81`), and
 * `0.1` is Box2D's margin for the same scale: small enough that a fat box
 * adds few extra overlaps, large enough that resting contacts don't move a
 * proxy every tick.
 */
export const aabbMargin = 0.1;

/**
 * A fat box is rebuilt when any of its sides is further than this from the
 * tight box, so a shape whose box shrank inside its fat box (a long shape
 * turning level, a collider swapped for a smaller one) stops reporting
 * overlaps it no longer has. A fresh fat box is one margin out, so this
 * allows four more.
 */
const maxFatAabbExtension = 5 * aabbMargin;

/**
 * Marks a missing node: no parent, no child, an empty tree or an empty free
 * list.
 */
const nullNode = -1;

/**
 * The number of nodes a new tree has room for before its pool first grows.
 */
const initialCapacity = 16;

/**
 * A dynamic bounding volume hierarchy over axis-aligned boxes that can be
 * added, moved and removed one at a time, the spatial index Box2D's
 * `b2DynamicTree` popularized for broad phases. It answers "which boxes
 * overlap this box" and "which boxes does this segment cross" without
 * testing every box.
 *
 * Each entry is a proxy: a leaf holding the caller's box grown by
 * {@link aabbMargin} on every side (its fat box) and a value of type `T`,
 * such as an entity. A new leaf goes where it grows the tree's total
 * perimeter the least, and rotations on the way back up keep the tree
 * shallow whatever order boxes arrive in.
 *
 * Nodes live in typed arrays with a free list: creating and destroying
 * proxies allocates nothing once the pool has grown, and neither do
 * {@link query}, {@link raycast} or a {@link moveProxy} that stays inside the
 * margin. The tree knows nothing about the ECS; the caller decides what goes
 * in it.
 * @typeParam T - The value stored with each proxy.
 */
export class DynamicAabbTree<T> {
  /**
   * Each node's box, four numbers per node: `minX`, `minY`, `maxX`, `maxY`.
   * A leaf's fat box, or the union of an internal node's children's boxes.
   */
  private _bounds: Float64Array;

  /**
   * Each node's parent, or {@link nullNode} for the root. On a free node,
   * the next free node.
   */
  private _parent: Int32Array;

  /**
   * Each internal node's first child, or {@link nullNode} on a leaf.
   */
  private _child1: Int32Array;

  /**
   * Each internal node's second child, or {@link nullNode} on a leaf.
   */
  private _child2: Int32Array;

  /**
   * `0` on a leaf, `1 + max(children's heights)` on an internal node, and
   * `-1` on a free node.
   */
  private _height: Int32Array;

  /**
   * Each leaf's value; `undefined` on internal and free nodes, so a
   * destroyed proxy doesn't keep its value alive.
   */
  private readonly _values: (T | undefined)[];

  /**
   * One reusable walk stack per nesting depth, so a callback can query the
   * tree again without the two walks sharing a stack.
   */
  private readonly _stacks: number[][];

  /**
   * How many nodes the pool has room for.
   */
  private _capacity: number;

  /**
   * The root node, or {@link nullNode} when the tree is empty.
   */
  private _root: number;

  /**
   * The first free node, or {@link nullNode} when the pool is full.
   */
  private _freeList: number;

  /**
   * The number of live proxies.
   */
  private _proxyCount: number;

  /**
   * How many {@link query} and {@link raycast} walks are running.
   */
  private _walkDepth: number;

  /**
   * Creates an empty tree.
   */
  constructor() {
    this._capacity = initialCapacity;
    this._bounds = new Float64Array(4 * initialCapacity);
    this._parent = new Int32Array(initialCapacity);
    this._child1 = new Int32Array(initialCapacity);
    this._child2 = new Int32Array(initialCapacity);
    this._height = new Int32Array(initialCapacity);
    this._values = [];
    this._stacks = [];
    this._root = nullNode;
    this._freeList = nullNode;
    this._proxyCount = 0;
    this._walkDepth = 0;
    this._chainFreeNodes(0);
  }

  /**
   * The number of live proxies.
   */
  get proxyCount(): number {
    return this._proxyCount;
  }

  /**
   * The number of edges from the root to the deepest leaf: `0` when the
   * tree is empty or holds one proxy.
   */
  get height(): number {
    return this._root === nullNode ? 0 : this._height[this._root];
  }

  /**
   * Adds a proxy whose fat box is `aabb` grown by {@link aabbMargin} on
   * every side.
   * @param aabb - The shape's tight box. A point box is allowed.
   * @param value - The value to store with the proxy, returned by
   * {@link getValue} and passed to query callbacks.
   * @returns The proxy's id, an integer `>= 0`. A destroyed proxy's id is
   * given to a later proxy.
   * @throws An error if `aabb` isn't finite with `min <= max` on both axes,
   * or if called from inside one of this tree's query callbacks.
   */
  public createProxy(aabb: Aabb, value: T): number {
    this._assertNotWalking('createProxy');
    assertFiniteBox('createProxy', aabb);

    const leaf = this._allocateNode();

    this._setFatBounds(leaf, aabb);
    this._values[leaf] = value;
    this._insertLeaf(leaf);
    this._proxyCount++;

    return leaf;
  }

  /**
   * Removes a proxy and frees its node for reuse.
   * @param proxyId - The proxy to remove.
   * @throws An error if `proxyId` isn't a live proxy, or if called from
   * inside one of this tree's query callbacks.
   */
  public destroyProxy(proxyId: number): void {
    this._assertNotWalking('destroyProxy');
    this._assertLiveProxy('destroyProxy', proxyId);

    this._removeLeaf(proxyId);
    this._freeNode(proxyId);
    this._proxyCount--;
  }

  /**
   * Updates a proxy after its shape moved. While the stored fat box still
   * contains `aabb` and none of its sides is more than five margins beyond
   * `aabb`'s, nothing changes. Otherwise the proxy is reinserted with a new
   * fat box, `aabb` grown by {@link aabbMargin}.
   * @param proxyId - The proxy to move.
   * @param aabb - The shape's new tight box.
   * @returns `true` if the proxy's fat box changed, so a caller looking for
   * new overlaps only needs to query with the proxies that returned `true`.
   * @throws An error if `proxyId` isn't a live proxy, if `aabb` isn't finite
   * with `min <= max` on both axes, or if called from inside one of this
   * tree's query callbacks.
   */
  public moveProxy(proxyId: number, aabb: Aabb): boolean {
    this._assertNotWalking('moveProxy');
    this._assertLiveProxy('moveProxy', proxyId);
    assertFiniteBox('moveProxy', aabb);

    if (this._fatBoundsFit(proxyId, aabb)) {
      return false;
    }

    this._removeLeaf(proxyId);
    this._setFatBounds(proxyId, aabb);
    this._insertLeaf(proxyId);

    return true;
  }

  /**
   * Reads a proxy's stored fat box.
   * @param proxyId - The proxy to read.
   * @param out - The box to write into; its `min` and `max` are overwritten.
   * @returns `out`.
   * @throws An error if `proxyId` isn't a live proxy.
   */
  public getFatAabb(proxyId: number, out: Aabb): Aabb {
    this._assertLiveProxy('getFatAabb', proxyId);

    const offset = 4 * proxyId;

    out.min.x = this._bounds[offset];
    out.min.y = this._bounds[offset + 1];
    out.max.x = this._bounds[offset + 2];
    out.max.y = this._bounds[offset + 3];

    return out;
  }

  /**
   * Reads the value a proxy was created with.
   * @param proxyId - The proxy to read.
   * @returns The proxy's value.
   * @throws An error if `proxyId` isn't a live proxy.
   */
  public getValue(proxyId: number): T {
    this._assertLiveProxy('getValue', proxyId);

    return this._leafValue(proxyId);
  }

  /**
   * Calls `callback` for every proxy whose fat box overlaps `aabb` (touching
   * counts), in tree order. The callback may query the tree again, but may
   * not create, destroy or move proxies.
   * @param aabb - The box to test. Its sides may be infinite.
   * @param callback - Called with each overlapping proxy's id and value.
   * Return `false` to stop the query, `true` to go on.
   * @throws An error if `aabb` has `min > max` on an axis or a `NaN`
   * coordinate.
   */
  public query(
    aabb: Aabb,
    callback: (proxyId: number, value: T) => boolean,
  ): void {
    const { min, max } = aabb;

    if (!(min.x <= max.x && min.y <= max.y)) {
      throw new Error(
        `DynamicAabbTree.query: box ${formatBox(aabb)} must have min <= max.`,
      );
    }

    const stack = this._beginWalk();

    try {
      let top = 0;

      if (this._root !== nullNode) {
        stack[top++] = this._root;
      }

      while (top > 0) {
        const node = stack[--top];

        if (!boxesOverlap(this._bounds, 4 * node, min.x, min.y, max.x, max.y)) {
          continue;
        }

        if (this._height[node] === 0) {
          if (!callback(node, this._leafValue(node))) {
            return;
          }

          continue;
        }

        stack[top++] = this._child1[node];
        stack[top++] = this._child2[node];
      }
    } finally {
      this._walkDepth--;
    }
  }

  /**
   * Calls `callback` for every proxy whose fat box the segment from `start`
   * to `end` reaches (touching counts), in tree order, not distance order.
   * Each call can stop the cast or clip the segment, so a closest-hit cast
   * skips every box beyond the closest hit found so far. The callback may
   * query the tree again, but may not create, destroy or move proxies.
   * @param start - The segment's start.
   * @param end - The segment's end.
   * @param callback - Called with each reached proxy's id, the current
   * `maxFraction` (the part of the segment, from `0` to `1`, still being
   * cast; it starts at `1`) and the proxy's value. Return `0` to stop the
   * cast, a fraction between `0` and `maxFraction` to clip the segment
   * there, or `maxFraction` to go on unchanged.
   * @throws An error if `start` or `end` isn't finite, or the callback
   * returns anything else.
   */
  public raycast(
    start: Vector2,
    end: Vector2,
    callback: (proxyId: number, maxFraction: number, value: T) => number,
  ): void {
    if (
      !Number.isFinite(start.x) ||
      !Number.isFinite(start.y) ||
      !Number.isFinite(end.x) ||
      !Number.isFinite(end.y)
    ) {
      throw new Error(
        `DynamicAabbTree.raycast: segment (${start.x}, ${start.y}) to (${end.x}, ${end.y}) must be finite.`,
      );
    }

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    let maxFraction = 1;
    const stack = this._beginWalk();

    try {
      let top = 0;

      if (this._root !== nullNode) {
        stack[top++] = this._root;
      }

      while (top > 0) {
        const node = stack[--top];

        if (
          !segmentReachesBox(
            this._bounds,
            4 * node,
            start.x,
            start.y,
            deltaX,
            deltaY,
            maxFraction,
          )
        ) {
          continue;
        }

        if (this._height[node] !== 0) {
          stack[top++] = this._child1[node];
          stack[top++] = this._child2[node];

          continue;
        }

        const fraction = callback(node, maxFraction, this._leafValue(node));

        if (fraction === 0) {
          return;
        }

        if (!(fraction > 0 && fraction <= maxFraction)) {
          throw new Error(
            `DynamicAabbTree.raycast: the callback for proxy ${node} returned ${fraction}, but must return 0, a fraction up to ${maxFraction}, or ${maxFraction}.`,
          );
        }

        maxFraction = fraction;
      }
    } finally {
      this._walkDepth--;
    }
  }

  /**
   * Removes every proxy, keeping the pool's capacity. Every proxy id from
   * before is dead afterwards, until a new proxy reuses it.
   * @throws An error if called from inside one of this tree's query
   * callbacks.
   */
  public clear(): void {
    this._assertNotWalking('clear');

    this._root = nullNode;
    this._freeList = nullNode;
    this._proxyCount = 0;
    this._values.length = 0;
    this._chainFreeNodes(0);
  }

  /**
   * Checks the tree's structure and throws, naming the node and the broken
   * rule, at the first inconsistency: parent links, children, heights, each
   * internal node's box being exactly the union of its children's, the
   * proxy count, and every node being either in the tree or on the free
   * list exactly once. Linear in the node count; meant for tests and
   * debugging.
   * @throws An error describing the first inconsistency found.
   */
  public validate(): void {
    const seen = new Uint8Array(this._capacity);
    const leafCount = this._validateTree(seen);

    if (leafCount !== this._proxyCount) {
      throw new Error(
        `DynamicAabbTree.validate: the tree holds ${leafCount} leaves, but proxyCount is ${this._proxyCount}.`,
      );
    }

    for (
      let node = this._freeList;
      node !== nullNode;
      node = this._parent[node]
    ) {
      if (seen[node] !== 0) {
        throw new Error(
          `DynamicAabbTree.validate: free node ${node} is also in the tree or twice on the free list.`,
        );
      }

      if (this._height[node] !== -1) {
        throw new Error(
          `DynamicAabbTree.validate: free node ${node} has height ${this._height[node]}, not -1.`,
        );
      }

      seen[node] = 1;
    }

    const lost = seen.indexOf(0);

    if (lost !== -1) {
      throw new Error(
        `DynamicAabbTree.validate: node ${lost} is neither in the tree nor on the free list.`,
      );
    }
  }

  /**
   * Walks the tree from the root, checking every node and marking it in
   * `seen`.
   * @returns The number of leaves reached.
   */
  private _validateTree(seen: Uint8Array): number {
    if (this._root === nullNode) {
      return 0;
    }

    if (this._parent[this._root] !== nullNode) {
      throw new Error(
        `DynamicAabbTree.validate: root ${this._root} has parent ${this._parent[this._root]}.`,
      );
    }

    const stack = [this._root];
    let leafCount = 0;

    while (stack.length > 0) {
      const node = stack.pop() ?? nullNode;

      if (seen[node] !== 0) {
        throw new Error(
          `DynamicAabbTree.validate: node ${node} is reached twice.`,
        );
      }

      seen[node] = 1;

      if (this._height[node] === 0) {
        this._validateLeaf(node);
        leafCount++;

        continue;
      }

      this._validateInternalNode(node);
      stack.push(this._child1[node], this._child2[node]);
    }

    return leafCount;
  }

  /**
   * Throws if a leaf has children.
   */
  private _validateLeaf(node: number): void {
    if (this._child1[node] !== nullNode || this._child2[node] !== nullNode) {
      throw new Error(`DynamicAabbTree.validate: leaf ${node} has children.`);
    }
  }

  /**
   * Throws unless an internal node has two live children that link back to
   * it, and its height and box are exactly what its children make them.
   */
  private _validateInternalNode(node: number): void {
    const child1 = this._child1[node];
    const child2 = this._child2[node];

    for (const child of [child1, child2]) {
      if (child < 0 || child >= this._capacity) {
        throw new Error(
          `DynamicAabbTree.validate: internal node ${node} has child ${child}, which isn't a node.`,
        );
      }

      if (this._parent[child] !== node) {
        throw new Error(
          `DynamicAabbTree.validate: node ${child}'s parent is ${this._parent[child]}, not ${node}.`,
        );
      }

      if (this._height[child] < 0) {
        throw new Error(
          `DynamicAabbTree.validate: node ${node}'s child ${child} is a free node.`,
        );
      }
    }

    const height = 1 + Math.max(this._height[child1], this._height[child2]);

    if (this._height[node] !== height) {
      throw new Error(
        `DynamicAabbTree.validate: node ${node} has height ${this._height[node]}, but its children make it ${height}.`,
      );
    }

    const offset = 4 * node;
    const offset1 = 4 * child1;
    const offset2 = 4 * child2;

    if (
      this._bounds[offset] !==
        Math.min(this._bounds[offset1], this._bounds[offset2]) ||
      this._bounds[offset + 1] !==
        Math.min(this._bounds[offset1 + 1], this._bounds[offset2 + 1]) ||
      this._bounds[offset + 2] !==
        Math.max(this._bounds[offset1 + 2], this._bounds[offset2 + 2]) ||
      this._bounds[offset + 3] !==
        Math.max(this._bounds[offset1 + 3], this._bounds[offset2 + 3])
    ) {
      throw new Error(
        `DynamicAabbTree.validate: node ${node}'s box isn't the union of its children's boxes.`,
      );
    }
  }

  /**
   * Places a leaf whose box is already set, next to the sibling that grows
   * the tree's total perimeter least, then balances and refits its
   * ancestors.
   */
  private _insertLeaf(leaf: number): void {
    if (this._root === nullNode) {
      this._root = leaf;
      this._parent[leaf] = nullNode;

      return;
    }

    const sibling = this._findBestSibling(leaf);
    const oldParent = this._parent[sibling];
    const newParent = this._allocateNode();

    this._parent[newParent] = oldParent;
    this._replaceChild(oldParent, sibling, newParent);
    this._child1[newParent] = sibling;
    this._child2[newParent] = leaf;
    this._parent[sibling] = newParent;
    this._parent[leaf] = newParent;
    // Fit the new parent first, so balancing it sees its real height.
    this._refit(newParent);
    this._refitAncestors(newParent);
  }

  /**
   * Descends from the root, at each internal node choosing between pairing
   * the leaf with the whole node and descending into the child whose box
   * the leaf grows least, by perimeter (2D's surface area). Ties descend
   * into the second child, so the same calls always build the same tree.
   */
  private _findBestSibling(leaf: number): number {
    const leafOffset = 4 * leaf;
    const minX = this._bounds[leafOffset];
    const minY = this._bounds[leafOffset + 1];
    const maxX = this._bounds[leafOffset + 2];
    const maxY = this._bounds[leafOffset + 3];
    let index = this._root;

    while (this._height[index] > 0) {
      const child1 = this._child1[index];
      const child2 = this._child2[index];
      const area = this._perimeter(index);
      const combined = this._unionPerimeter(index, minX, minY, maxX, maxY);
      // Pairing the leaf with this node makes a new parent with the combined
      // box.
      const cost = 2 * combined;
      // Descending further still grows this node's box, and so every box
      // above it.
      const inherited = 2 * (combined - area);
      const cost1 =
        this._descendCost(child1, minX, minY, maxX, maxY) + inherited;
      const cost2 =
        this._descendCost(child2, minX, minY, maxX, maxY) + inherited;

      if (cost < cost1 && cost < cost2) {
        break;
      }

      index = cost1 < cost2 ? child1 : child2;
    }

    return index;
  }

  /**
   * The perimeter a box adds by descending into `child`: the whole new
   * parent's perimeter for a leaf, or only the growth of an internal node.
   */
  private _descendCost(
    child: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): number {
    const combined = this._unionPerimeter(child, minX, minY, maxX, maxY);

    return this._height[child] === 0
      ? combined
      : combined - this._perimeter(child);
  }

  /**
   * Takes a leaf out of the tree, freeing its parent node and promoting its
   * sibling, then balances and refits the ancestors. The leaf's own node
   * isn't freed.
   */
  private _removeLeaf(leaf: number): void {
    if (leaf === this._root) {
      this._root = nullNode;

      return;
    }

    const parent = this._parent[leaf];
    const grandparent = this._parent[parent];
    const sibling =
      this._child1[parent] === leaf
        ? this._child2[parent]
        : this._child1[parent];

    this._replaceChild(grandparent, parent, sibling);
    this._parent[sibling] = grandparent;
    this._freeNode(parent);
    this._refitAncestors(grandparent);
  }

  /**
   * Walks from `node` up to the root, rebalancing each node and refitting
   * its box and height.
   */
  private _refitAncestors(node: number): void {
    let index = node;

    while (index !== nullNode) {
      index = this._balance(index);
      this._refit(index);
      index = this._parent[index];
    }
  }

  /**
   * When one child of `node` is more than one level taller than the other,
   * rotates the taller child up into `node`'s place.
   * @returns The node now in `node`'s place.
   */
  private _balance(node: number): number {
    if (this._height[node] < 2) {
      return node;
    }

    const child1 = this._child1[node];
    const child2 = this._child2[node];
    const balance = this._height[child2] - this._height[child1];

    if (balance > 1) {
      return this._rotateUp(node, child2);
    }

    if (balance < -1) {
      return this._rotateUp(node, child1);
    }

    return node;
  }

  /**
   * Moves `child` into `node`'s place, with `node` as its first child. Of
   * `child`'s own children, the taller stays with it and the shorter takes
   * `child`'s old place under `node`.
   * @returns `child`, now in `node`'s place.
   */
  private _rotateUp(node: number, child: number): number {
    const grandchild1 = this._child1[child];
    const grandchild2 = this._child2[child];
    const keep =
      this._height[grandchild1] > this._height[grandchild2]
        ? grandchild1
        : grandchild2;
    const moved = keep === grandchild1 ? grandchild2 : grandchild1;
    const parent = this._parent[node];

    this._parent[child] = parent;
    this._replaceChild(parent, node, child);
    this._child1[child] = node;
    this._child2[child] = keep;
    this._parent[node] = child;

    if (this._child1[node] === child) {
      this._child1[node] = moved;
    } else {
      this._child2[node] = moved;
    }

    this._parent[moved] = node;
    this._refit(node);
    this._refit(child);

    return child;
  }

  /**
   * Sets an internal node's box to the union of its children's and its
   * height to one more than the taller child's.
   */
  private _refit(node: number): void {
    const offset = 4 * node;
    const offset1 = 4 * this._child1[node];
    const offset2 = 4 * this._child2[node];
    const bounds = this._bounds;

    bounds[offset] = Math.min(bounds[offset1], bounds[offset2]);
    bounds[offset + 1] = Math.min(bounds[offset1 + 1], bounds[offset2 + 1]);
    bounds[offset + 2] = Math.max(bounds[offset1 + 2], bounds[offset2 + 2]);
    bounds[offset + 3] = Math.max(bounds[offset1 + 3], bounds[offset2 + 3]);
    this._height[node] =
      1 +
      Math.max(
        this._height[this._child1[node]],
        this._height[this._child2[node]],
      );
  }

  /**
   * Points `parent`'s link to `oldChild` at `newChild` instead, or makes
   * `newChild` the root when `parent` is {@link nullNode}.
   */
  private _replaceChild(
    parent: number,
    oldChild: number,
    newChild: number,
  ): void {
    if (parent === nullNode) {
      this._root = newChild;

      return;
    }

    if (this._child1[parent] === oldChild) {
      this._child1[parent] = newChild;

      return;
    }

    this._child2[parent] = newChild;
  }

  /**
   * Whether a leaf's fat box still contains `aabb` and reaches no further
   * than {@link maxFatAabbExtension} beyond it on any side.
   */
  private _fatBoundsFit(leaf: number, aabb: Aabb): boolean {
    const offset = 4 * leaf;
    const fatMinX = this._bounds[offset];
    const fatMinY = this._bounds[offset + 1];
    const fatMaxX = this._bounds[offset + 2];
    const fatMaxY = this._bounds[offset + 3];
    const { min, max } = aabb;

    return (
      fatMinX <= min.x &&
      fatMinY <= min.y &&
      fatMaxX >= max.x &&
      fatMaxY >= max.y &&
      fatMinX >= min.x - maxFatAabbExtension &&
      fatMinY >= min.y - maxFatAabbExtension &&
      fatMaxX <= max.x + maxFatAabbExtension &&
      fatMaxY <= max.y + maxFatAabbExtension
    );
  }

  /**
   * Stores `aabb` grown by {@link aabbMargin} as a leaf's box.
   */
  private _setFatBounds(leaf: number, aabb: Aabb): void {
    const offset = 4 * leaf;

    this._bounds[offset] = aabb.min.x - aabbMargin;
    this._bounds[offset + 1] = aabb.min.y - aabbMargin;
    this._bounds[offset + 2] = aabb.max.x + aabbMargin;
    this._bounds[offset + 3] = aabb.max.y + aabbMargin;
  }

  /**
   * The perimeter of a node's box.
   */
  private _perimeter(node: number): number {
    const offset = 4 * node;

    return (
      2 *
      (this._bounds[offset + 2] -
        this._bounds[offset] +
        this._bounds[offset + 3] -
        this._bounds[offset + 1])
    );
  }

  /**
   * The perimeter of the union of a node's box and the given box.
   */
  private _unionPerimeter(
    node: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): number {
    const offset = 4 * node;
    const width =
      Math.max(this._bounds[offset + 2], maxX) -
      Math.min(this._bounds[offset], minX);
    const height =
      Math.max(this._bounds[offset + 3], maxY) -
      Math.min(this._bounds[offset + 1], minY);

    return 2 * (width + height);
  }

  /**
   * A live leaf's value.
   */
  private _leafValue(leaf: number): T {
    // Every live leaf was given a value by createProxy. `T` itself may
    // include `undefined`, so the slot can't be checked against it.
    return this._values[leaf] as T;
  }

  /**
   * Takes a node off the free list, growing the pool when it's empty.
   */
  private _allocateNode(): number {
    if (this._freeList === nullNode) {
      this._grow();
    }

    const node = this._freeList;

    this._freeList = this._parent[node];
    this._parent[node] = nullNode;
    this._child1[node] = nullNode;
    this._child2[node] = nullNode;
    this._height[node] = 0;

    return node;
  }

  /**
   * Puts a node back on the free list.
   */
  private _freeNode(node: number): void {
    this._parent[node] = this._freeList;
    this._child1[node] = nullNode;
    this._child2[node] = nullNode;
    this._height[node] = -1;
    this._values[node] = undefined;
    this._freeList = node;
  }

  /**
   * Doubles the pool, copying every node and chaining the new ones onto the
   * free list.
   */
  private _grow(): void {
    const oldCapacity = this._capacity;
    const capacity = 2 * oldCapacity;
    const bounds = new Float64Array(4 * capacity);
    const parent = new Int32Array(capacity);
    const child1 = new Int32Array(capacity);
    const child2 = new Int32Array(capacity);
    const height = new Int32Array(capacity);

    bounds.set(this._bounds);
    parent.set(this._parent);
    child1.set(this._child1);
    child2.set(this._child2);
    height.set(this._height);

    this._bounds = bounds;
    this._parent = parent;
    this._child1 = child1;
    this._child2 = child2;
    this._height = height;
    this._capacity = capacity;
    this._chainFreeNodes(oldCapacity);
  }

  /**
   * Makes the nodes from `first` to the end of the pool free, in ascending
   * order, ahead of the current free list.
   */
  private _chainFreeNodes(first: number): void {
    for (let node = this._capacity - 1; node >= first; node--) {
      this._freeNode(node);
    }
  }

  /**
   * Starts a query walk, returning this nesting depth's stack.
   */
  private _beginWalk(): number[] {
    if (this._walkDepth === this._stacks.length) {
      this._stacks.push([]);
    }

    return this._stacks[this._walkDepth++];
  }

  /**
   * Throws if a query walk is running, since changing the tree would move
   * nodes the walk's stack still points at.
   */
  private _assertNotWalking(method: string): void {
    if (this._walkDepth > 0) {
      throw new Error(
        `DynamicAabbTree.${method}: the tree can't be changed from inside one of its own query or raycast callbacks.`,
      );
    }
  }

  /**
   * Throws if `proxyId` isn't a live leaf.
   */
  private _assertLiveProxy(method: string, proxyId: number): void {
    if (
      !Number.isInteger(proxyId) ||
      proxyId < 0 ||
      proxyId >= this._capacity ||
      this._height[proxyId] !== 0
    ) {
      throw new Error(
        `DynamicAabbTree.${method}: proxy ${proxyId} isn't a live proxy.`,
      );
    }
  }
}

/**
 * Throws unless every coordinate of `aabb` is finite and `min <= max` on
 * both axes.
 */
function assertFiniteBox(method: string, aabb: Aabb): void {
  const { min, max } = aabb;

  if (
    Number.isFinite(min.x) &&
    Number.isFinite(min.y) &&
    Number.isFinite(max.x) &&
    Number.isFinite(max.y) &&
    min.x <= max.x &&
    min.y <= max.y
  ) {
    return;
  }

  throw new Error(
    `DynamicAabbTree.${method}: box ${formatBox(aabb)} must be finite with min <= max.`,
  );
}

function formatBox({ min, max }: Aabb): string {
  return `min (${min.x}, ${min.y}) max (${max.x}, ${max.y})`;
}
