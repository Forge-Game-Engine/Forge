/**
 * Disjoint sets over the indices `0` to `size - 1`, with path halving and
 * union by size, so a sequence of operations runs in near-constant time per
 * operation. The sleep system uses it to group bodies into islands, keyed by
 * their index in its batch rather than by entity handle, since handles are
 * sparse.
 */
export class UnionFind {
  private readonly _parent: Int32Array;
  private readonly _size: Int32Array;

  /**
   * Creates `size` sets, each holding one index.
   * @param size - The number of indices.
   * @throws An error if `size` isn't a non-negative integer.
   */
  constructor(size: number) {
    if (!Number.isInteger(size) || size < 0) {
      throw new Error(
        `Unable to create a UnionFind of size ${size}, it must be a non-negative integer.`,
      );
    }

    this._parent = new Int32Array(size);
    this._size = new Int32Array(size).fill(1);

    for (let i = 0; i < size; i++) {
      this._parent[i] = i;
    }
  }

  /**
   * The number of indices.
   */
  get size(): number {
    return this._parent.length;
  }

  /**
   * Finds the representative index of `index`'s set, pointing every other
   * node on the path it walks at its grandparent.
   * @param index - The index to look up.
   * @returns The representative of the set holding `index`.
   * @throws An error if `index` is out of range.
   */
  public find(index: number): number {
    this._assertInRange(index);

    let current = index;

    while (this._parent[current] !== current) {
      const grandparent = this._parent[this._parent[current]];

      this._parent[current] = grandparent;
      current = grandparent;
    }

    return current;
  }

  /**
   * Merges the sets holding `a` and `b`, putting the smaller set's
   * representative under the larger's.
   * @param a - An index in the first set.
   * @param b - An index in the second set.
   * @throws An error if `a` or `b` is out of range.
   */
  public union(a: number, b: number): void {
    let rootA = this.find(a);
    let rootB = this.find(b);

    if (rootA === rootB) {
      return;
    }

    if (this._size[rootA] < this._size[rootB]) {
      [rootA, rootB] = [rootB, rootA];
    }

    this._parent[rootB] = rootA;
    this._size[rootA] += this._size[rootB];
  }

  private _assertInRange(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new Error(
        `Unable to find index ${index} in a UnionFind of size ${this.size}.`,
      );
    }
  }
}
