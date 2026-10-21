/**
 * A graph that {@link findPath} can search. Nodes are the integers `0` to
 * `nodeCount - 1`, so a graph can use cell indices or point ids directly
 * and a search can keep per-node data in arrays instead of maps.
 *
 * A graph must not change while a search over it is running, which only
 * matters if one of its own methods could change it.
 */
export interface NavigationGraph {
  /**
   * One more than the largest node id the graph uses. Ids below it that
   * aren't in use (a removed waypoint, say) are fine: they're just never
   * reported as a neighbor.
   */
  readonly nodeCount: number;

  /**
   * Calls `visit` for each node reachable in one step from `node`, with
   * the cost of that step. The cost must be finite and at least `0`.
   * Steps are directed: an undirected connection is reported from both
   * ends.
   * @param node - The node whose neighbors to visit.
   * @param visit - Called once per step out of `node`.
   */
  forEachNeighbor(
    node: number,
    visit: (neighbor: number, cost: number) => void,
  ): void;

  /**
   * An estimate of the cost of the cheapest path from `node` to `goal`. It
   * must be finite, at least `0` and never more than the real cost
   * (admissible), or the path found may not be the cheapest. Returning `0`
   * everywhere is always correct, and makes the search Dijkstra's
   * algorithm. A heuristic that also never drops by more than a step's cost
   * across that step (consistent, as distances are) never makes the search
   * expand a node twice.
   * @param node - The node to estimate from.
   * @param goal - The node the search is looking for.
   * @returns The estimated remaining cost.
   */
  heuristic(node: number, goal: number): number;
}
