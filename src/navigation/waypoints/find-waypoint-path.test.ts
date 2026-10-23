import { beforeEach, describe, expect, it } from 'vitest';
import { Random } from '../../math/random.js';
import { findPath } from '../find-path.js';
import { shortestCosts, TestEdge } from '../test-helpers/test-graph.js';
import { createWaypointGraph } from './create-waypoint-graph.js';
import { findWaypointPath } from './find-waypoint-path.js';
import { WaypointGraph } from './waypoint-graph.js';

/**
 * A small road network, Y-down:
 *
 * ```text
 * a ---- b ---- c ---- d
 * |      |             |
 * |      f ---- g ---- h
 * e /           |      |
 *               i ---- j
 * ```
 *
 * `e` sits a little lower than `f`, so going round through it is never
 * as short as going through `b`.
 */
interface RoadNetwork {
  graph: WaypointGraph;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
  i: number;
  j: number;
}

const createRoadNetwork = (): RoadNetwork => {
  const graph = createWaypointGraph();
  const a = graph.addPoint({ x: 0, y: 0 });
  const b = graph.addPoint({ x: 100, y: 0 });
  const c = graph.addPoint({ x: 200, y: 0 });
  const d = graph.addPoint({ x: 300, y: 0 });
  const e = graph.addPoint({ x: 0, y: 120 });
  const f = graph.addPoint({ x: 100, y: 100 });
  const g = graph.addPoint({ x: 200, y: 100 });
  const h = graph.addPoint({ x: 300, y: 100 });
  const i = graph.addPoint({ x: 200, y: 200 });
  const j = graph.addPoint({ x: 300, y: 200 });

  for (const [from, to] of [
    [a, b],
    [b, c],
    [c, d],
    [a, e],
    [b, f],
    [d, h],
    [e, f],
    [f, g],
    [g, h],
    [g, i],
    [i, j],
    [h, j],
  ]) {
    graph.connect(from, to);
  }

  return { graph, a, b, c, d, e, f, g, h, i, j };
};

/** The cost of a route's steps, worked out from the graph's points. */
const routeCost = (graph: WaypointGraph, nodes: readonly number[]): number => {
  let cost = 0;

  for (let index = 1; index < nodes.length; index++) {
    const from = graph.getPosition(nodes[index - 1]);
    const to = graph.getPosition(nodes[index]);

    cost +=
      Math.hypot(to.x - from.x, to.y - from.y) * graph.getCost(nodes[index]);
  }

  return cost;
};

describe('findWaypointPath', () => {
  let roads: RoadNetwork;

  beforeEach(() => {
    roads = createRoadNetwork();
  });

  it('finds the shortest route on a road network', () => {
    const { graph, a, b, c, d } = roads;
    const result = findWaypointPath(graph, { x: -10, y: 5 }, { x: 310, y: 5 });

    expect(result.status).toBe('found');
    expect(result.startPointId).toBe(a);
    expect(result.goalPointId).toBe(d);
    expect(result.nodes).toEqual([a, b, c, d]);
    expect(result.cost).toBe(300);
    expect(result.cost).toBeCloseTo(routeCost(graph, result.nodes));
  });

  it('uses a one-way road in its direction and goes round it against it', () => {
    const { graph, a, b, c, d, f, g, h } = roads;

    // b to c becomes one way.
    graph.disconnect(c, b, { bidirectional: false });

    const there = findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 });
    const back = findWaypointPath(graph, { x: 300, y: 0 }, { x: 0, y: 0 });

    expect(there.nodes).toEqual([a, b, c, d]);
    expect(back.status).toBe('found');
    expect(back.nodes).toEqual([d, h, g, f, b, a]);
    expect(back.cost).toBe(500);
  });

  it('routes around a disabled point and back through it once enabled', () => {
    const { graph, a, b, c, d, f, g, h } = roads;

    graph.setEnabled(c, false);

    const detour = findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 });

    expect(detour.status).toBe('found');
    expect(detour.nodes).toEqual([a, b, f, g, h, d]);
    expect(detour.cost).toBe(500);

    graph.setEnabled(c, true);

    expect(
      findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 }).nodes,
    ).toEqual([a, b, c, d]);
  });

  it('never snaps an end to a disabled point', () => {
    const { graph, b, d } = roads;

    graph.setEnabled(roads.a, false);

    const result = findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 });

    expect(result.startPointId).toBe(b);
    expect(result.goalPointId).toBe(d);
  });

  it('routes around a removed point, and a new point with its id brings no road back', () => {
    const { graph, a, b, c, d, f, g, h } = roads;

    graph.removePoint(c);

    expect(
      findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 }).nodes,
    ).toEqual([a, b, f, g, h, d]);

    expect(graph.addPoint({ x: 200, y: 0 })).toBe(c);
    expect(
      findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 }).nodes,
    ).toEqual([a, b, f, g, h, d]);
  });

  it('uses a costly point when it is still cheaper and avoids it when it is not', () => {
    const { graph, a, b, c, d, f, g, h } = roads;

    graph.setCost(c, 2);

    const through = findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 });

    expect(through.nodes).toEqual([a, b, c, d]);
    expect(through.cost).toBe(400);

    graph.setCost(c, 6);

    const around = findWaypointPath(graph, { x: 0, y: 0 }, { x: 300, y: 0 });

    expect(around.nodes).toEqual([a, b, f, g, h, d]);
    expect(around.cost).toBe(500);
  });

  it('prefers a cheap road to a shorter one', () => {
    const graph = createWaypointGraph();
    const start = graph.addPoint({ x: 0, y: 0 });
    const goal = graph.addPoint({ x: 100, y: 0 });
    const road = graph.addPoint({ x: 50, y: 40 }, 0.25);

    graph.connect(start, goal);
    graph.connect(start, road);
    graph.connect(road, goal);

    const result = findWaypointPath(graph, { x: 0, y: 0 }, { x: 100, y: 0 });
    const leg = Math.hypot(50, 40);

    expect(result.nodes).toEqual([start, road, goal]);
    expect(result.cost).toBeCloseTo(leg * 0.25 + leg);
  });

  it('returns the position of each point on the route, not the two ends', () => {
    const { graph } = roads;
    const fromWorld = { x: -10, y: 5 };
    const toWorld = { x: 310, y: 5 };
    const result = findWaypointPath(graph, fromWorld, toWorld);

    expect(result.points).toHaveLength(result.nodes.length);
    expect(result.points).toEqual(
      result.nodes.map((node) => graph.getPosition(node)),
    );
    expect(result.points).not.toContainEqual(fromWorld);
    expect(result.points).not.toContainEqual(toWorld);

    result.points[0].x = 1000;

    expect(graph.getPosition(result.nodes[0])).toEqual({ x: 0, y: 0 });
  });

  it('ends an unreachable route at the reached point nearest the goal', () => {
    const { graph, a, j } = roads;
    const island = graph.addPoint({ x: 1000, y: 1000 });
    const shore = graph.addPoint({ x: 1100, y: 1000 });

    graph.connect(island, shore);

    const result = findWaypointPath(
      graph,
      { x: 0, y: 0 },
      { x: 1100, y: 1000 },
    );

    expect(result.status).toBe('unreachable');
    expect(result.goalPointId).toBe(shore);
    expect(result.nodes[0]).toBe(a);
    expect(result.nodes.at(-1)).toBe(j);
    expect(result.points.at(-1)).toEqual(graph.getPosition(j));
    expect(result.points).toHaveLength(result.nodes.length);
  });

  it('passes maxExpanded to the search', () => {
    const result = findWaypointPath(
      roads.graph,
      { x: 0, y: 0 },
      { x: 300, y: 200 },
      { maxExpanded: 1 },
    );

    expect(result.status).toBe('limitReached');
    expect(result.expanded).toBe(1);
    expect(result.points).toHaveLength(result.nodes.length);
  });

  it('returns an empty unreachable route when no point is enabled', () => {
    const empty = createWaypointGraph();
    const expected = {
      status: 'unreachable',
      nodes: [],
      cost: 0,
      expanded: 0,
      points: [],
      startPointId: null,
      goalPointId: null,
    };

    expect(findWaypointPath(empty, { x: 0, y: 0 }, { x: 1, y: 1 })).toEqual(
      expected,
    );

    for (const id of roads.graph.getPointIds()) {
      roads.graph.setEnabled(id, false);
    }

    expect(
      findWaypointPath(roads.graph, { x: 0, y: 0 }, { x: 300, y: 0 }),
    ).toEqual(expected);
  });

  it('finds a one-point route when both ends are nearest the same point', () => {
    const result = findWaypointPath(
      roads.graph,
      { x: 1, y: 2 },
      { x: -3, y: 4 },
    );

    expect(result.status).toBe('found');
    expect(result.nodes).toEqual([roads.a]);
    expect(result.points).toEqual([{ x: 0, y: 0 }]);
    expect(result.cost).toBe(0);
  });

  it.each([
    [{ x: NaN, y: 0 }, { x: 0, y: 0 }, 'fromWorld'],
    [{ x: 0, y: 0 }, { x: 0, y: -Infinity }, 'toWorld'],
  ])('throws for a position that is not finite', (from, to, name) => {
    expect(() => findWaypointPath(roads.graph, from, to)).toThrow(
      `Unable to find a waypoint path, ${name}`,
    );
  });
});

describe('waypoint graph search', () => {
  it.each(['one', 'two', 'three', 'four', 'five'])(
    'finds the cheapest path on random graph %s',
    (seed) => {
      const random = new Random(seed);
      const graph = createWaypointGraph();
      const pointCount = 40;

      for (let index = 0; index < pointCount; index++) {
        graph.addPoint(
          { x: random.randomInt(0, 500), y: random.randomInt(0, 500) },
          random.randomFloat(0.25, 4),
        );
      }

      for (let index = 0; index < 100; index++) {
        const a = random.randomInt(0, pointCount - 1);
        const b = random.randomInt(0, pointCount - 1);

        if (a !== b) {
          graph.connect(a, b, {
            bidirectional: random.randomFloat(0, 1) < 0.7,
          });
        }
      }

      for (let index = 0; index < 4; index++) {
        const id = random.randomInt(0, pointCount - 1);

        if (graph.hasPoint(id)) {
          graph.setEnabled(id, false);
        }

        const removed = random.randomInt(0, pointCount - 1);

        if (graph.hasPoint(removed)) {
          graph.removePoint(removed);
        }
      }

      const edges: TestEdge[] = [];

      for (let node = 0; node < graph.nodeCount; node++) {
        graph.forEachNeighbor(node, (neighbor, cost) => {
          edges.push([node, neighbor, cost]);
        });
      }

      const ids = graph.getPointIds();

      for (let trial = 0; trial < 10; trial++) {
        const start = ids[random.randomInt(0, ids.length - 1)];
        const goal = ids[random.randomInt(0, ids.length - 1)];
        const expected = shortestCosts(graph.nodeCount, edges, start)[goal];
        const result = findPath(graph, start, goal);

        // The heuristic never drops by more than a step's cost.
        for (const [from, to, cost] of edges) {
          expect(graph.heuristic(from, goal)).toBeLessThanOrEqual(
            cost + graph.heuristic(to, goal) + 1e-9,
          );
        }

        if (expected === Infinity) {
          expect(result.status).toBe('unreachable');

          continue;
        }

        expect(result.status).toBe('found');
        expect(result.cost).toBeCloseTo(expected, 6);
      }
    },
  );
});
