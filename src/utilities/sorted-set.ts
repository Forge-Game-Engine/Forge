/**
 * A small SortedSet implementation keyed by item value with a numeric priority.
 * - Lower priority values come first.
 * - Items with the same priority preserve insertion order (stable).
 * - No duplicate items (by reference equality) are allowed.
 * - Iteration uses an internal cached, sorted array for efficiency.
 */
export class SortedSet<T> {
  private readonly _map: Map<T, { priority: number; seq: number }>;
  private _cache: Array<{ item: T; priority: number }> | null;
  private _seqCounter: number;

  /**
   * Create a new SortedSet.
   */
  constructor() {
    this._map = new Map();
    this._cache = null;
    this._seqCounter = 0;
  }

  /**
   * Add an item with the provided priority.
   * @param item - The item to add (unique by reference).
   * @param priority - Numeric priority; lower numbers sort earlier.
   * @returns `true` when the set changed (item added or priority updated),
   * `false` when the item already existed with the same priority.
   */
  public add(item: T, priority: number): boolean {
    const existingMeta = this._map.get(item);

    if (existingMeta) {
      if (existingMeta.priority === priority) {
        return false;
      }

      existingMeta.priority = priority;

      this._invalidateCache();

      return true;
    }

    this._map.set(item, { priority, seq: this._seqCounter++ });

    this._invalidateCache();

    return true;
  }

  /** Remove an item. Returns true if the item was present. */
  public delete(item: T): boolean {
    const removed = this._map.delete(item);

    if (removed) {
      this._invalidateCache();
    }

    return removed;
  }

  /** Returns true when the item exists in the set. */
  public has(item: T): boolean {
    return this._map.has(item);
  }

  /** Remove all items. */
  public clear(): void {
    if (this._map.size === 0) {
      return;
    }

    this._map.clear();
    this._invalidateCache();
    this._seqCounter = 0;
  }

  /** Number of items in the set. */
  get size(): number {
    return this._map.size;
  }

  /** Get the priority for an item or undefined if not present. */
  /**
   * Get the numeric priority for an item.
   * @param item - The item to query.
   * @returns The priority number or `undefined` when the item is not present.
   */
  public getPriority(item: T): number | undefined {
    const meta = this._map.get(item);

    if (!meta) {
      return undefined;
    }

    return meta.priority;
  }

  /** Iterate items in sorted order (by priority asc, then insertion order). */
  public *values(): IterableIterator<T> {
    for (const e of this._getCache()) {
      yield e.item;
    }
  }

  /** Iterate entries as [item, priority]. */
  public *entries(): IterableIterator<readonly [T, number]> {
    for (const e of this._getCache()) {
      yield [e.item, e.priority] as const;
    }
  }

  /**
   * forEach helper that visits entries in sorted order.
   * @param callback - Invoked with `(item, priority)` for each entry.
   */
  public forEach(callback: (item: T, priority: number) => void): void {
    for (const e of this._getCache()) {
      callback(e.item, e.priority);
    }
  }

  /** Default iterator yields values. */
  public [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  private _invalidateCache(): void {
    this._cache = null;
  }

  private _getCache(): Array<{ item: T; priority: number }> {
    if (this._cache) {
      return this._cache;
    }

    const arr: Array<{ item: T; priority: number; seq: number }> = [];

    for (const [item, meta] of this._map.entries()) {
      arr.push({ item, priority: meta.priority, seq: meta.seq });
    }

    arr.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return a.seq - b.seq;
    });

    this._cache = arr.map((x) => ({ item: x.item, priority: x.priority }));

    return this._cache;
  }
}

export default SortedSet;
