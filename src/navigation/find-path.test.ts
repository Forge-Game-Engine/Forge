import { describe, expect, it } from 'vitest';
import { Random } from '../math/random.js';
import { findPath } from './find-path.js';
import { NavigationGraph } from './navigation-graph.js';
import {
  createRandomGraph,
  createTestGraph,
  shortestCosts,
  TestEdge,
} from './test-helpers/test-graph.js';

/** Steps both ways between each pair. */
const undirected = (edges: readonly TestEdge[]): TestEdge[] =>
  edges.flatMap(([from, to, cost]) => [
    [from, to, cost],
    [to, from, cost],
  ]);

/** A corridor `0 - 1 - ... - (length - 1)` with steps of cost 1. */
const createCorridor = (length: number, goal: number): NavigationGraph =>
  createTestGraph(
    length,
    undirected(
      Array.from({ length: length - 1 }, (_, node): TestEdge => [
        node,
        node + 1,
        1,
      ]),
    ),
    (node) => Math.abs(goal - node),
  );

/** An open 4-connected grid with steps of cost 1 and Manhattan distance. */
const createOpenGrid = (columns: number, rows: number): NavigationGraph => ({
  nodeCount: columns * rows,
  forEachNeighbor: (node, visit) => {
    const column = node % columns;
    const row = Math.floor(node / columns);

    if (column > 0) {
      visit(node - 1, 1);
    }

    if (column < columns - 1) {
      visit(node + 1, 1);
    }

    if (row > 0) {
      visit(node - columns, 1);
    }

    if (row < rows - 1) {
      visit(node + columns, 1);
    }
  },
  heuristic: (node, goal) =>
    Math.abs((node % columns) - (goal % columns)) +
    Math.abs(Math.floor(node / columns) - Math.floor(goal / columns)),
});

/** The cost of following `nodes` along the cheapest step between each pair. */
const pathCost = (edges: readonly TestEdge[], nodes: number[]): number => {
  let total = 0;

  for (let i = 1; i < nodes.length; i++) {
    const steps = edges.filter(
      ([from, to]) => from === nodes[i - 1] && to === nodes[i],
    );

    expect(steps.length).toBeGreaterThan(0);
    total += Math.min(...steps.map(([, , cost]) => cost));
  }

  return total;
};

describe('findPath', () => {
  it('finds the path along a line', () => {
    const result = findPath(createCorridor(5, 4), 0, 4);

    expect(result).toEqual({
      status: 'found',
      nodes: [0, 1, 2, 3, 4],
      cost: 4,
      expanded: 4,
    });
  });

  it('takes the cheap route around a diamond', () => {
    // 0 -> 1 -> 3 costs 2; 0 -> 2 -> 3 costs 10.
    const graph = createTestGraph(
      4,
      undirected([
        [0, 1, 1],
        [1, 3, 1],
        [0, 2, 5],
        [2, 3, 5],
      ]),
    );

    const result = findPath(graph, 0, 3);

    expect(result.status).toBe('found');
    expect(result.nodes).toEqual([0, 1, 3]);
    expect(result.cost).toBe(2);
  });

  it('takes a longer route when its weighted steps cost less', () => {
    const graph = createTestGraph(5, [
      [0, 4, 10],
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 4, 1],
    ]);

    const result = findPath(graph, 0, 4);

    expect(result.nodes).toEqual([0, 1, 2, 3, 4]);
    expect(result.cost).toBe(4);
  });

  it('only follows steps in their direction', () => {
    const graph = createTestGraph(3, [
      [0, 1, 1],
      [1, 2, 1],
    ]);

    expect(findPath(graph, 0, 2).status).toBe('found');
    expect(findPath(graph, 2, 0).status).toBe('unreachable');
  });

  it('follows steps that cost nothing', () => {
    const graph = createTestGraph(4, [
      [0, 1, 0],
      [1, 2, 0],
      [2, 3, 0],
      [0, 3, 1],
    ]);

    const result = findPath(graph, 0, 3);

    expect(result.nodes).toEqual([0, 1, 2, 3]);
    expect(result.cost).toBe(0);
  });

  it('returns the start alone when it is the goal', () => {
    const result = findPath(createCorridor(3, 1), 1, 1);

    expect(result).toEqual({
      status: 'found',
      nodes: [1],
      cost: 0,
      expanded: 0,
    });
  });

  it('reports an unreachable goal with the path to the closest node reached', () => {
    // Node 3 has no steps into it.
    const graph = createTestGraph(
      4,
      undirected([
        [0, 1, 2],
        [1, 2, 3],
      ]),
      (node, goal) => Math.abs(goal - node),
    );

    const result = findPath(graph, 0, 3);

    expect(result).toEqual({
      status: 'unreachable',
      nodes: [0, 1, 2],
      cost: 5,
      expanded: 3,
    });
  });

  it('returns the start alone for an unreachable goal when nothing reached is closer', () => {
    const graph = createTestGraph(2, [], () => 1);

    expect(findPath(graph, 0, 1)).toEqual({
      status: 'unreachable',
      nodes: [0],
      cost: 0,
      expanded: 1,
    });
  });

  it('stops at maxExpanded with the path to the closest node reached', () => {
    const result = findPath(createCorridor(10, 9), 0, 9, { maxExpanded: 3 });

    expect(result).toEqual({
      status: 'limitReached',
      nodes: [0, 1, 2, 3],
      cost: 3,
      expanded: 3,
    });
  });

  it('returns the start alone when maxExpanded is 0', () => {
    expect(findPath(createCorridor(4, 3), 0, 3, { maxExpanded: 0 })).toEqual({
      status: 'limitReached',
      nodes: [0],
      cost: 0,
      expanded: 0,
    });
  });

  it('finds the goal when maxExpanded is 0 and the start is the goal', () => {
    expect(
      findPath(createCorridor(4, 3), 3, 3, { maxExpanded: 0 }).status,
    ).toBe('found');
  });

  it('changes nothing when the search stays under maxExpanded', () => {
    const graph = createCorridor(6, 5);

    expect(findPath(graph, 0, 5, { maxExpanded: 100 })).toEqual(
      findPath(graph, 0, 5),
    );
  });

  it('treats maxExpanded of undefined as no limit', () => {
    expect(
      findPath(createCorridor(6, 5), 0, 5, { maxExpanded: undefined }).status,
    ).toBe('found');
  });

  it('expands only the nodes on the path across an open grid', () => {
    const columns = 20;
    const rows = 15;
    const goal = columns * rows - 1;

    const result = findPath(createOpenGrid(columns, rows), 0, goal);

    expect(result.status).toBe('found');
    expect(result.cost).toBe(columns - 1 + rows - 1);
    expect(result.expanded).toBe(result.nodes.length - 1);
  });

  it('reopens a node when an inconsistent heuristic finds a cheaper way to it after expanding it', () => {
    // The cheapest path is 0 -> 1 -> 3 -> 4 (cost 5), but the heuristic
    // makes the search expand 3 through 2 (cost 4) first.
    const estimates = [0, 4, 0, 0, 0];
    const graph = createTestGraph(
      5,
      [
        [0, 1, 1],
        [0, 2, 1],
        [1, 3, 1],
        [2, 3, 3],
        [3, 4, 3],
      ],
      (node) => estimates[node],
    );

    const result = findPath(graph, 0, 4);

    expect(result).toEqual({
      status: 'found',
      nodes: [0, 1, 3, 4],
      cost: 5,
      expanded: 5,
    });
  });

  describe('on random graphs', () => {
    const random = new Random('find-path');
    const graphs = Array.from({ length: 200 }, () =>
      createRandomGraph(
        random,
        random.randomInt(2, 40),
        random.randomInt(0, 120),
      ),
    );

    const checkOptimal = (
      heuristicFor: (
        randomGraph: (typeof graphs)[number],
        goal: number,
      ) => (node: number) => number,
    ): void => {
      for (const randomGraph of graphs) {
        const { nodeCount, edges } = randomGraph;
        const start = random.randomInt(0, nodeCount - 1);
        const goal = random.randomInt(0, nodeCount - 1);
        const heuristic = heuristicFor(randomGraph, goal);
        const graph = createTestGraph(nodeCount, edges, (node) =>
          heuristic(node),
        );
        const expected = shortestCosts(nodeCount, edges, start)[goal];

        const result = findPath(graph, start, goal);

        expect(result.nodes[0]).toBe(start);
        expect(pathCost(edges, result.nodes)).toBe(result.cost);

        if (expected === Infinity) {
          expect(result.status).toBe('unreachable');
        } else {
          expect(result.status).toBe('found');
          expect(result.nodes[result.nodes.length - 1]).toBe(goal);
          expect(result.cost).toBe(expected);
        }
      }
    };

    it('finds the cheapest path with a consistent heuristic', () => {
      checkOptimal(
        ({ distance }, goal) =>
          (node) =>
            distance(node, goal),
      );
    });

    it('finds the cheapest path with a heuristic of 0 (Dijkstra)', () => {
      checkOptimal(() => () => 0);
    });

    it('finds the cheapest path with an admissible but inconsistent heuristic', () => {
      checkOptimal(({ nodeCount, edges }, goal) => {
        // A random fraction of each node's exact remaining cost.
        const reversed = edges.map(([from, to, cost]): TestEdge => [
          to,
          from,
          cost,
        ]);
        const remaining = shortestCosts(nodeCount, reversed, goal);
        const fractions = remaining.map(() => random.randomFloat(0, 1));

        return (node) =>
          remaining[node] === Infinity
            ? 0
            : Math.floor(remaining[node] * fractions[node]);
      });
    });
  });

  describe('reusing its arrays', () => {
    it('gives the same result for the same search twice', () => {
      const graph = createOpenGrid(8, 8);

      expect(findPath(graph, 3, 60)).toEqual(findPath(graph, 3, 60));
    });

    it('searches a bigger graph after a smaller one and the other way round', () => {
      const small = createCorridor(3, 2);
      const big = createOpenGrid(30, 30);

      expect(findPath(small, 0, 2).cost).toBe(2);
      expect(findPath(big, 0, 899).cost).toBe(58);
      expect(findPath(small, 2, 0).nodes).toEqual([2, 1, 0]);
    });

    it('searches again after a graph method threw', () => {
      const throwing: NavigationGraph = {
        nodeCount: 3,
        forEachNeighbor: () => {
          throw new Error('graph failure');
        },
        heuristic: () => 0,
      };

      expect(() => findPath(throwing, 0, 2)).toThrow('graph failure');
      expect(findPath(createCorridor(3, 2), 0, 2).nodes).toEqual([0, 1, 2]);
    });

    it('passes the same visit function to every forEachNeighbor call', () => {
      const visits = new Set<unknown>();
      const corridor = createCorridor(10, 9);
      const recording: NavigationGraph = {
        nodeCount: corridor.nodeCount,
        forEachNeighbor: (node, visit) => {
          visits.add(visit);
          corridor.forEachNeighbor(node, visit);
        },
        heuristic: (node, goal) => corridor.heuristic(node, goal),
      };

      findPath(recording, 0, 9);
      findPath(recording, 9, 0);

      expect(visits.size).toBe(1);
    });
  });

  describe('validation', () => {
    const graph = createCorridor(4, 3);

    it.each([-1, 4, 1.5, NaN])('throws for start %s', (start) => {
      expect(() => findPath(graph, start, 3)).toThrow(
        `Unable to find a path from node ${start}`,
      );
    });

    it.each([-1, 4, 1.5, NaN])('throws for goal %s', (goal) => {
      expect(() => findPath(graph, 0, goal)).toThrow(
        `Unable to find a path to node ${goal}`,
      );
    });

    it.each([-1, 1.5, NaN, Infinity])(
      'throws for nodeCount %s',
      (nodeCount) => {
        expect(() => findPath({ ...graph, nodeCount }, 0, 0)).toThrow(
          `the graph's nodeCount is ${nodeCount}`,
        );
      },
    );

    it.each([-1, 1.5, NaN, -Infinity])(
      'throws for maxExpanded %s',
      (maxExpanded) => {
        expect(() => findPath(graph, 0, 3, { maxExpanded })).toThrow(
          `Unable to find a path with maxExpanded ${maxExpanded}`,
        );
      },
    );

    it.each([-1, 4, 0.5, NaN])('throws for a neighbor %s', (neighbor) => {
      const badGraph = createTestGraph(4, [[0, neighbor, 1]]);

      expect(() => findPath(badGraph, 0, 3)).toThrow(
        `the graph reported neighbor ${neighbor} of node 0`,
      );
    });

    it.each([-1, NaN, Infinity])('throws for a step cost %s', (cost) => {
      const badGraph = createTestGraph(4, [[0, 1, cost]]);

      expect(() => findPath(badGraph, 0, 3)).toThrow(
        `the graph reported a step from node 0 to node 1 costing ${cost}`,
      );
    });

    it.each([-1, NaN, Infinity])('throws for a heuristic %s', (estimate) => {
      const badGraph = createTestGraph(4, [], () => estimate);

      expect(() => findPath(badGraph, 0, 3)).toThrow(
        `the graph's heuristic from node 0 to node 3 is ${estimate}`,
      );
    });

    it('throws when called from a graph method during another search', () => {
      const corridor = createCorridor(4, 3);
      const nested: NavigationGraph = {
        nodeCount: 4,
        forEachNeighbor: (node, visit) => {
          findPath(corridor, 0, 3);
          corridor.forEachNeighbor(node, visit);
        },
        heuristic: () => 0,
      };

      expect(() => findPath(nested, 0, 3)).toThrow(
        'findPath was called from a graph',
      );
      expect(findPath(corridor, 0, 3).status).toBe('found');
    });

    it('throws when a graph calls visit after its search ended', () => {
      let savedVisit: ((neighbor: number, cost: number) => void) | null = null;
      const saving: NavigationGraph = {
        nodeCount: 2,
        forEachNeighbor: (_, visit) => {
          savedVisit = visit;
        },
        heuristic: () => 0,
      };

      findPath(saving, 0, 1);

      expect(savedVisit).not.toBeNull();
      expect(() => savedVisit?.(1, 1)).toThrow('no path search is running');
    });
  });
});
