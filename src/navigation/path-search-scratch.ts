/** The largest id a `Uint32Array` stamp can hold. */
const maxSearchId = 0xffffffff;

/** How many open-list entries the entry arrays hold when they're first used. */
const initialEntryCapacity = 64;

/**
 * The arrays a path search keeps its per-node and per-entry data in,
 * reused from one search to the next so a search allocates nothing per
 * node.
 *
 * Per-node data is only valid for a node whose `stamp` equals the current
 * `searchId`, so starting a search is incrementing the id, not clearing
 * arrays the size of the graph.
 */
export class PathSearchScratch {
  /** The id of the last search that reached each node. */
  public stamp: Uint32Array;

  /** The cheapest cost found so far from the start to each node. */
  public cost: Float64Array;

  /** Each node's heuristic to the goal, asked for once per search. */
  public estimate: Float64Array;

  /** The node each node was reached from, `-1` for the start. */
  public parent: Int32Array;

  /** The node each open-list entry is for. */
  public entryNode: Int32Array;

  /** The node's cost when each open-list entry was added. */
  public entryCost: Float64Array;

  /** Each entry's cost plus its node's estimate, the order it's taken in. */
  public entryTotal: Float64Array;

  /** The id of the current search. Starts at `1`, so zeroed stamps are never current. */
  public searchId: number;

  /** The number of open-list entries the current search has added. */
  public entryCount: number;

  /**
   * Creates empty scratch arrays; `begin` grows them to the graph searched.
   */
  constructor() {
    this.stamp = new Uint32Array(0);
    this.cost = new Float64Array(0);
    this.estimate = new Float64Array(0);
    this.parent = new Int32Array(0);
    this.entryNode = new Int32Array(0);
    this.entryCost = new Float64Array(0);
    this.entryTotal = new Float64Array(0);
    this.searchId = 0;
    this.entryCount = 0;
  }

  /**
   * Starts a search: grows the per-node arrays to hold `nodeCount` nodes,
   * moves to the next search id and forgets the last search's entries.
   * @param nodeCount - The number of node ids in the graph searched.
   */
  public begin(nodeCount: number): void {
    if (nodeCount > this.stamp.length) {
      // A new search id makes every old value stale, so nothing is copied.
      this.stamp = new Uint32Array(nodeCount);
      this.cost = new Float64Array(nodeCount);
      this.estimate = new Float64Array(nodeCount);
      this.parent = new Int32Array(nodeCount);
    }

    if (this.searchId === maxSearchId) {
      this.stamp.fill(0);
      this.searchId = 0;
    }

    this.searchId++;
    this.entryCount = 0;
  }

  /**
   * Checks whether the current search has reached a node.
   * @param node - The node id.
   * @returns `true` if the node's data belongs to the current search.
   */
  public isReached(node: number): boolean {
    return this.stamp[node] === this.searchId;
  }

  /**
   * Records that the current search reached a node for the first time.
   * @param node - The node id.
   * @param cost - The cost of the path to it.
   * @param estimate - Its heuristic to the goal.
   * @param parent - The node it was reached from, `-1` for the start.
   */
  public reach(
    node: number,
    cost: number,
    estimate: number,
    parent: number,
  ): void {
    this.stamp[node] = this.searchId;
    this.cost[node] = cost;
    this.estimate[node] = estimate;
    this.parent[node] = parent;
  }

  /**
   * Adds an open-list entry, doubling the entry arrays when they're full.
   * @param node - The node the entry is for.
   * @param cost - The node's cost when the entry is added.
   * @param total - The cost plus the node's estimate.
   * @returns The entry's index.
   */
  public addEntry(node: number, cost: number, total: number): number {
    if (this.entryCount === this.entryNode.length) {
      this._growEntries();
    }

    const entry = this.entryCount;

    this.entryNode[entry] = node;
    this.entryCost[entry] = cost;
    this.entryTotal[entry] = total;
    this.entryCount++;

    return entry;
  }

  /**
   * Doubles the entry arrays' capacity, keeping the current search's
   * entries, which the open list still refers to.
   */
  private _growEntries(): void {
    const capacity = Math.max(initialEntryCapacity, this.entryNode.length * 2);
    const entryNode = new Int32Array(capacity);
    const entryCost = new Float64Array(capacity);
    const entryTotal = new Float64Array(capacity);

    entryNode.set(this.entryNode);
    entryCost.set(this.entryCost);
    entryTotal.set(this.entryTotal);

    this.entryNode = entryNode;
    this.entryCost = entryCost;
    this.entryTotal = entryTotal;
  }
}
