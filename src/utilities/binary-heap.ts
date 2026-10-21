/**
 * A binary min-heap: `pop` always returns the item that `compare` orders
 * first. Ties come out in no particular order, so a compare function that
 * needs a stable order breaks its own ties.
 *
 * An item's order must not change while it's in the heap; to change it,
 * push the item again with its new order and skip the old one when it's
 * popped.
 */
export class BinaryHeap<T> {
  private readonly _items: T[];
  private readonly _compare: (a: T, b: T) => number;

  /**
   * Creates an empty heap.
   * @param compare - Orders two items like `Array.prototype.sort`'s compare
   * function: negative when `a` comes out before `b`, positive when after,
   * `0` when either order is fine.
   */
  constructor(compare: (a: T, b: T) => number) {
    this._items = [];
    this._compare = compare;
  }

  /** The number of items in the heap. */
  get size(): number {
    return this._items.length;
  }

  /**
   * Adds an item. O(log n).
   * @param item - The item to add.
   */
  public push(item: T): void {
    this._items.push(item);
    this._siftUp(this._items.length - 1, item);
  }

  /**
   * Removes and returns the first item. O(log n).
   * @returns The item `compare` orders first.
   * @throws An error if the heap is empty.
   */
  public pop(): T {
    const first = this.peek();
    const lastIndex = this._items.length - 1;
    const last = this._items[lastIndex];

    this._items.length = lastIndex;

    if (lastIndex > 0) {
      this._siftDown(0, last);
    }

    return first;
  }

  /**
   * Returns the first item without removing it. O(1).
   * @returns The item `compare` orders first.
   * @throws An error if the heap is empty.
   */
  public peek(): T {
    if (this._items.length === 0) {
      throw new Error('Unable to read from the binary heap, it is empty.');
    }

    return this._items[0];
  }

  /** Removes every item, keeping the array's capacity. */
  public clear(): void {
    this._items.length = 0;
  }

  /**
   * Moves the hole at `index` up towards the root until `item` fits there,
   * then writes `item` into it.
   * @param index - The index of the hole.
   * @param item - The item to place.
   */
  private _siftUp(index: number, item: T): void {
    let hole = index;

    while (hole > 0) {
      const parentIndex = (hole - 1) >> 1;
      const parent = this._items[parentIndex];

      if (this._compare(item, parent) >= 0) {
        break;
      }

      this._items[hole] = parent;
      hole = parentIndex;
    }

    this._items[hole] = item;
  }

  /**
   * Moves the hole at `index` down towards the leaves until `item` fits
   * there, then writes `item` into it.
   * @param index - The index of the hole.
   * @param item - The item to place.
   */
  private _siftDown(index: number, item: T): void {
    const length = this._items.length;
    let hole = index;

    for (;;) {
      const leftIndex = 2 * hole + 1;

      if (leftIndex >= length) {
        break;
      }

      const rightIndex = leftIndex + 1;
      const childIndex =
        rightIndex < length &&
        this._compare(this._items[rightIndex], this._items[leftIndex]) < 0
          ? rightIndex
          : leftIndex;
      const child = this._items[childIndex];

      if (this._compare(item, child) <= 0) {
        break;
      }

      this._items[hole] = child;
      hole = childIndex;
    }

    this._items[hole] = item;
  }
}
