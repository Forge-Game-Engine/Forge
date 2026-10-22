import { BinaryHeap } from '../utilities/binary-heap.js';
import { withDefaults } from '../utilities/with-defaults.js';
import { NavigationGraph } from './navigation-graph.js';
import { PathSearchScratch } from './path-search-scratch.js';

/**
 * How a {@link findPath} search ended: `'found'` when it reached the goal,
 * `'unreachable'` when it searched every node it could reach without
 * finding the goal, and `'limitReached'` when it stopped at
 * `maxExpanded`.
 */
export type PathStatus = 'found' | 'unreachable' | 'limitReached';

/** Options for {@link findPath}. */
export interface FindPathOptions {
  /**
   * The most nodes the search expands (takes off its open list and visits
   * the neighbors of) before it stops with `'limitReached'`, so a search
   * for a goal that can't be reached in a big graph can't stall a frame.
   * A non-negative integer, or `Infinity` (the default) for no limit.
   */
  maxExpanded?: number;
}

/** The result of {@link findPath}. */
export interface FindPathResult {
  /** How the search ended. */
  readonly status: PathStatus;

  /**
   * The path from the start, both ends included.
   *
   * For `'found'` it ends at the goal and is the cheapest path. Otherwise
   * it ends at the node with the lowest heuristic to the goal (the lowest
   * cost to reach it when tied) among those the search took off its open
   * list, which is where a unit should head in the meantime. That's just
   * `[start]` when no such node is closer to the goal than the start.
   */
  readonly nodes: number[];

  /** The total cost of the steps in `nodes`. */
  readonly cost: number;

  /** How many nodes the search expanded. The goal is never expanded. */
  readonly expanded: number;
}

const defaultFindPathOptions = { maxExpanded: Infinity };

/** The search running right now, read by `visit` and `reach`. */
interface ActiveSearch {
  graph: NavigationGraph | null;
  nodeCount: number;
  goal: number;
  node: number;
  running: boolean;
}

// One set of arrays for every search, grown to the largest graph searched,
// so a search allocates nothing per node. JavaScript runs one call at a
// time, so the only way two searches could share them at once is a graph
// method calling `findPath`, which `findPath` rejects.
const scratch = new PathSearchScratch();

const active: ActiveSearch = {
  graph: null,
  nodeCount: 0,
  goal: -1,
  node: -1,
  running: false,
};

/**
 * Orders open-list entries by their estimated total cost, then by the
 * lower heuristic (the entry further along, which makes a search across
 * open ground run straight at the goal instead of widening across every
 * equally good path), then newest first, which only makes the order
 * deterministic.
 * @param a - An entry index.
 * @param b - Another entry index.
 * @returns Negative when `a` comes out first.
 */
const compareEntries = (a: number, b: number): number => {
  const totalDifference = scratch.entryTotal[a] - scratch.entryTotal[b];

  if (totalDifference !== 0) {
    return totalDifference;
  }

  const estimateDifference =
    scratch.estimate[scratch.entryNode[a]] -
    scratch.estimate[scratch.entryNode[b]];

  if (estimateDifference !== 0) {
    return estimateDifference;
  }

  return b - a;
};

// Entries are never updated in place: a cheaper way to a node adds a new
// entry, and the old one is skipped as stale when it's popped.
const open = new BinaryHeap<number>(compareEntries);

const getActiveGraph = (): NavigationGraph => {
  if (active.graph === null) {
    throw new Error('Unable to continue the path search, none is running.');
  }

  return active.graph;
};

const isNodeId = (value: number, nodeCount: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < nodeCount;

/**
 * Records a node reached for the first time this search and adds it to the
 * open list.
 * @param node - The node reached.
 * @param cost - The cost of the path to it.
 * @param parent - The node it was reached from, `-1` for the start.
 */
const reach = (node: number, cost: number, parent: number): void => {
  const estimate = getActiveGraph().heuristic(node, active.goal);

  if (!Number.isFinite(estimate) || estimate < 0) {
    throw new Error(
      `Unable to find a path, the graph's heuristic from node ${node} to node ${active.goal} is ${estimate}, it must be a finite number of at least 0.`,
    );
  }

  scratch.reach(node, cost, estimate, parent);
  open.push(scratch.addEntry(node, cost, cost + estimate));
};

// Created once, so expanding a node allocates no closure.
const visit = (neighbor: number, stepCost: number): void => {
  if (!active.running) {
    throw new Error(
      `Unable to visit neighbor ${neighbor}, no path search is running. A graph calls visit only from inside forEachNeighbor.`,
    );
  }

  const node = active.node;

  if (!isNodeId(neighbor, active.nodeCount)) {
    throw new Error(
      `Unable to find a path, the graph reported neighbor ${neighbor} of node ${node}, it must be an integer from 0 to ${active.nodeCount - 1}.`,
    );
  }

  if (!Number.isFinite(stepCost) || stepCost < 0) {
    throw new Error(
      `Unable to find a path, the graph reported a step from node ${node} to node ${neighbor} costing ${stepCost}, it must be a finite number of at least 0.`,
    );
  }

  const cost = scratch.cost[node] + stepCost;

  if (!scratch.isReached(neighbor)) {
    reach(neighbor, cost, node);

    return;
  }

  // Without a closed set, a cheaper way to a node that was already expanded
  // puts it back on the open list, so the path is the cheapest for any
  // admissible heuristic, even one that isn't consistent.
  if (cost < scratch.cost[neighbor]) {
    scratch.cost[neighbor] = cost;
    scratch.parent[neighbor] = node;
    open.push(
      scratch.addEntry(neighbor, cost, cost + scratch.estimate[neighbor]),
    );
  }
};

/**
 * Checks whether `node` is a better partial-path end than `best`: closer
 * to the goal by heuristic, or as close and cheaper to reach.
 * @param node - The node just taken off the open list.
 * @param best - The best end found so far.
 * @returns `true` if `node` is better.
 */
const isCloser = (node: number, best: number): boolean => {
  const estimateDifference = scratch.estimate[node] - scratch.estimate[best];

  if (estimateDifference !== 0) {
    return estimateDifference < 0;
  }

  return scratch.cost[node] < scratch.cost[best];
};

const buildResult = (
  status: PathStatus,
  last: number,
  expanded: number,
): FindPathResult => {
  const nodes: number[] = [];

  for (let node = last; node !== -1; node = scratch.parent[node]) {
    nodes.push(node);
  }

  nodes.reverse();

  return { status, nodes, cost: scratch.cost[last], expanded };
};

const validateInput = (
  nodeCount: number,
  start: number,
  goal: number,
  maxExpanded: number,
): void => {
  if (!Number.isInteger(nodeCount) || nodeCount < 0) {
    throw new Error(
      `Unable to find a path, the graph's nodeCount is ${nodeCount}, it must be an integer of at least 0.`,
    );
  }

  if (!isNodeId(start, nodeCount)) {
    throw new Error(
      `Unable to find a path from node ${start}, it isn't a node of the graph, which has node ids from 0 to ${nodeCount - 1}.`,
    );
  }

  if (!isNodeId(goal, nodeCount)) {
    throw new Error(
      `Unable to find a path to node ${goal}, it isn't a node of the graph, which has node ids from 0 to ${nodeCount - 1}.`,
    );
  }

  if (
    maxExpanded !== Infinity &&
    (!Number.isInteger(maxExpanded) || maxExpanded < 0)
  ) {
    throw new Error(
      `Unable to find a path with maxExpanded ${maxExpanded}, it must be an integer of at least 0, or Infinity.`,
    );
  }
};

/**
 * Finds the cheapest path from `start` to `goal` through a graph, with A*.
 *
 * A goal that can't be reached and a search that hits `maxExpanded` aren't
 * errors: the result's `status` says how the search ended, and its `nodes`
 * still lead from the start towards the goal.
 *
 * Every search reuses one set of arrays, so a search allocates nothing per
 * node and starting one costs the same whatever the graph's size. They're
 * kept for as long as the page runs: 24 bytes for each node of the largest
 * graph searched, plus 20 bytes for each open-list entry slot. A search
 * adds an entry for each node it reaches and another for each cheaper path
 * it finds to a node it already reached, and the entry arrays double when
 * they fill, so they hold up to twice the most entries a search added.
 * @param graph - The graph to search.
 * @param start - The node to start from.
 * @param goal - The node to find a path to.
 * @param options - Options for the search.
 * @returns How the search ended, the path and its cost, and how many nodes
 * it expanded.
 * @throws An error if `start` or `goal` isn't a node id of the graph, if
 * the graph's `nodeCount` isn't a non-negative integer, if the graph
 * reports a neighbor that isn't one of its node ids, a step cost that's
 * negative or not finite, or a heuristic that's negative or not finite, if
 * `maxExpanded` isn't a non-negative integer or `Infinity`, or if it's
 * called from one of a graph's methods during another search.
 */
export const findPath = (
  graph: NavigationGraph,
  start: number,
  goal: number,
  options?: FindPathOptions,
): FindPathResult => {
  const { maxExpanded } = withDefaults(defaultFindPathOptions, options);
  const { nodeCount } = graph;

  validateInput(nodeCount, start, goal, maxExpanded);

  if (active.running) {
    throw new Error(
      `Unable to find a path from node ${start} to node ${goal}, findPath was called from a graph's forEachNeighbor or heuristic while another search was running.`,
    );
  }

  active.running = true;
  active.graph = graph;
  active.nodeCount = nodeCount;
  active.goal = goal;

  try {
    scratch.begin(nodeCount);
    reach(start, 0, -1);

    let best = start;
    let expanded = 0;

    while (open.size > 0) {
      const entry = open.pop();
      const node = scratch.entryNode[entry];
      const isStale = scratch.entryCost[entry] > scratch.cost[node];

      if (isStale) {
        continue;
      }

      if (node === goal) {
        return buildResult('found', goal, expanded);
      }

      if (isCloser(node, best)) {
        best = node;
      }

      if (expanded >= maxExpanded) {
        return buildResult('limitReached', best, expanded);
      }

      expanded++;
      active.node = node;
      graph.forEachNeighbor(node, visit);
    }

    return buildResult('unreachable', best, expanded);
  } finally {
    open.clear();
    active.running = false;
    active.graph = null;
    active.node = -1;
  }
};
