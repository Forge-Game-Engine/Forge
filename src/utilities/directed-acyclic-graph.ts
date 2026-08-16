/**
 * A directed acyclic graph (DAG) of unique nodes (by reference equality)
 * connected by "must run before" edges.
 * - `addEdge(from, to)` declares that `from` must be ordered before `to`.
 * - `topologicalSort()` returns every node in an order that respects every
 *   edge; nodes with no ordering constraint between them keep their
 *   relative insertion order (a stable sort).
 * - Adding an edge that would create a cycle throws instead of silently
 *   producing an unusable graph.
 */
export class DirectedAcyclicGraph<T> {
  private readonly _nodes: Set<T>;
  private readonly _edges: Map<T, Set<T>>;
  private readonly _insertionOrder: Map<T, number>;
  private readonly _nodeLabel: (node: T) => string;
  private _insertionCounter: number;
  private _cache: T[] | null;

  /**
   * Create a new, empty DirectedAcyclicGraph.
   * @param nodeLabel - Formats a node for error messages (e.g. when a cycle
   * or a reference to an unknown node is detected). Defaults to `String(node)`.
   */
  constructor(nodeLabel: (node: T) => string = (node) => String(node)) {
    this._nodes = new Set();
    this._edges = new Map();
    this._insertionOrder = new Map();
    this._nodeLabel = nodeLabel;
    this._insertionCounter = 0;
    this._cache = null;
  }

  /** Number of nodes in the graph. */
  get size(): number {
    return this._nodes.size;
  }

  /**
   * Adds a node to the graph. Adding a node that's already present is a no-op.
   * @param node - The node to add (unique by reference).
   */
  public addNode(node: T): void {
    if (this._nodes.has(node)) {
      return;
    }

    this._nodes.add(node);
    this._edges.set(node, new Set());
    this._insertionOrder.set(node, this._insertionCounter++);

    this._invalidateCache();
  }

  /**
   * Declares that `from` must be ordered before `to`. Adding the same edge
   * twice is a no-op.
   * @param from - The node that must come first. Must already be in the graph.
   * @param to - The node that must come after `from`. Must already be in the graph.
   * @throws An error if either node hasn't been added yet, if `from` and
   * `to` are the same node, or if the edge would create a cycle.
   */
  public addEdge(from: T, to: T): void {
    this._requireNode(from);
    this._requireNode(to);

    if (from === to) {
      throw new Error(
        `Unable to add an edge from "${this._nodeLabel(from)}" to itself.`,
      );
    }

    const fromEdges = this._edges.get(from)!;

    if (fromEdges.has(to)) {
      return;
    }

    fromEdges.add(to);

    if (!this._computeOrder()) {
      const cycle = this._findCycleThrough(from)!;

      fromEdges.delete(to);

      throw new Error(
        `Unable to add an edge from "${this._nodeLabel(from)}" to "${this._nodeLabel(to)}", it would create a cycle: ${cycle.map((node) => this._nodeLabel(node)).join(' -> ')}.`,
      );
    }

    this._invalidateCache();
  }

  /**
   * Removes a node and every edge connected to it. Removing a node that
   * isn't in the graph is a no-op.
   * @param node - The node to remove.
   */
  public removeNode(node: T): void {
    if (!this._nodes.delete(node)) {
      return;
    }

    this._edges.delete(node);
    this._insertionOrder.delete(node);

    for (const dependents of this._edges.values()) {
      dependents.delete(node);
    }

    this._invalidateCache();
  }

  /**
   * @param node - The node to check.
   * @returns Whether `node` has been added to the graph.
   */
  public has(node: T): boolean {
    return this._nodes.has(node);
  }

  /**
   * @returns Every node in an order that respects every declared edge, with
   * nodes that have no ordering constraint between them kept in insertion order.
   */
  public topologicalSort(): T[] {
    return [...this._getCache()];
  }

  private _requireNode(node: T): void {
    if (!this._nodes.has(node)) {
      throw new Error(
        `Unable to reference node "${this._nodeLabel(node)}", it has not been added to the graph. Call addNode first.`,
      );
    }
  }

  /**
   * Kahn's algorithm: repeatedly picks the earliest-inserted node with no
   * remaining incoming edges. Returns `null` if a cycle prevents every node
   * from being ordered.
   */
  private _computeOrder(): T[] | null {
    const remainingNodes = [...this._nodes].sort(
      (a, b) => this._insertionOrder.get(a)! - this._insertionOrder.get(b)!,
    );
    const inDegree = new Map<T, number>();

    for (const node of remainingNodes) {
      inDegree.set(node, 0);
    }

    for (const dependents of this._edges.values()) {
      for (const to of dependents) {
        inDegree.set(to, inDegree.get(to)! + 1);
      }
    }

    const order: T[] = [];
    const totalNodes = remainingNodes.length;

    while (order.length < totalNodes) {
      const nextIndex = remainingNodes.findIndex(
        (node) => inDegree.get(node) === 0,
      );

      if (nextIndex === -1) {
        return null;
      }

      const [node] = remainingNodes.splice(nextIndex, 1);
      order.push(node);

      for (const to of this._edges.get(node)!) {
        inDegree.set(to, inDegree.get(to)! - 1);
      }
    }

    return order;
  }

  /** Depth-first search for a cycle reachable from `start`, used to build a descriptive error message. */
  private _findCycleThrough(start: T): T[] | null {
    const visitState = new Map<T, 'visiting' | 'visited'>();
    const path: T[] = [];

    const visit = (node: T): T[] | null => {
      visitState.set(node, 'visiting');
      path.push(node);

      for (const next of this._edges.get(node)!) {
        const state = visitState.get(next);

        if (state === 'visiting') {
          const cycleStart = path.indexOf(next);

          return [...path.slice(cycleStart), next];
        }

        if (state !== 'visited') {
          const cycle = visit(next);

          if (cycle) {
            return cycle;
          }
        }
      }

      path.pop();
      visitState.set(node, 'visited');

      return null;
    };

    return visit(start);
  }

  private _invalidateCache(): void {
    this._cache = null;
  }

  private _getCache(): T[] {
    if (this._cache) {
      return this._cache;
    }

    const order = this._computeOrder();

    if (!order) {
      throw new Error('Unable to topologically sort a cyclic graph.');
    }

    this._cache = order;

    return this._cache;
  }
}

export default DirectedAcyclicGraph;
