import { Random } from '../../math/random.js';
import { NavigationGraph } from '../navigation-graph.js';

/** A directed step of a test graph: `[from, to, cost]`. */
export type TestEdge = readonly [from: number, to: number, cost: number];

/**
 * Creates a graph from a list of directed steps.
 * @param nodeCount - The graph's node count.
 * @param edges - The steps, reported by `forEachNeighbor` in this order.
 * @param heuristic - The graph's heuristic, `0` everywhere by default.
 * @returns The graph.
 */
export const createTestGraph = (
  nodeCount: number,
  edges: readonly TestEdge[],
  heuristic: (node: number, goal: number) => number = () => 0,
): NavigationGraph => {
  const outgoing: TestEdge[][] = Array.from({ length: nodeCount }, () => []);

  for (const edge of edges) {
    outgoing[edge[0]].push(edge);
  }

  return {
    nodeCount,
    forEachNeighbor: (node, visit) => {
      for (const [, to, cost] of outgoing[node]) {
        visit(to, cost);
      }
    },
    heuristic,
  };
};

/** A seeded random graph whose nodes have positions. */
export interface RandomGraph {
  readonly nodeCount: number;
  readonly edges: readonly TestEdge[];

  /** The straight-line distance between two nodes, a consistent heuristic. */
  distance(a: number, b: number): number;
}

/**
 * Creates a random directed graph: nodes at random integer positions,
 * connected by random steps that each cost a whole number at least as big
 * as the distance they cover, so `distance` is a consistent heuristic and
 * path costs add up exactly.
 * @param random - The random number generator.
 * @param nodeCount - The number of nodes.
 * @param edgeCount - The number of steps.
 * @returns The graph's steps and positions.
 */
export const createRandomGraph = (
  random: Random,
  nodeCount: number,
  edgeCount: number,
): RandomGraph => {
  const xs = Array.from({ length: nodeCount }, () => random.randomInt(0, 50));
  const ys = Array.from({ length: nodeCount }, () => random.randomInt(0, 50));
  const distance = (a: number, b: number): number =>
    Math.hypot(xs[a] - xs[b], ys[a] - ys[b]);
  const edges: TestEdge[] = [];

  while (edges.length < edgeCount) {
    const from = random.randomInt(0, nodeCount - 1);
    const to = random.randomInt(0, nodeCount - 1);

    if (from !== to) {
      edges.push([
        from,
        to,
        Math.ceil(distance(from, to)) + random.randomInt(0, 5),
      ]);
    }
  }

  return { nodeCount, edges, distance };
};

/**
 * Finds the cost of the cheapest path from `start` to every node with
 * Bellman-Ford, independently of `findPath`, as a reference.
 * @param nodeCount - The number of nodes.
 * @param edges - The graph's steps.
 * @param start - The node to start from.
 * @returns Each node's cheapest cost, `Infinity` if it can't be reached.
 */
export const shortestCosts = (
  nodeCount: number,
  edges: readonly TestEdge[],
  start: number,
): number[] => {
  const costs = new Array<number>(nodeCount).fill(Infinity);

  costs[start] = 0;

  for (let pass = 1; pass < nodeCount; pass++) {
    let changed = false;

    for (const [from, to, cost] of edges) {
      if (costs[from] + cost < costs[to]) {
        costs[to] = costs[from] + cost;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return costs;
};
