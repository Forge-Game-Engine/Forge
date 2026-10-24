import { describe, expect, it } from 'vitest';
import { createWaypointGraph } from './create-waypoint-graph.js';
import { createWaypointPathPlanner } from './create-waypoint-path-planner.js';
import { WaypointGraph } from './waypoint-graph.js';

/**
 * Three points in a row, Y-down, `a` to `b` to `c`, and `d` on its own:
 *
 * ```text
 * a ---- b ---- c        d
 * ```
 */
const createRoad = (): {
  graph: WaypointGraph;
  a: number;
  b: number;
  c: number;
  d: number;
} => {
  const graph = createWaypointGraph();
  const a = graph.addPoint({ x: 0, y: 0 });
  const b = graph.addPoint({ x: 100, y: 0 });
  const c = graph.addPoint({ x: 200, y: 0 });
  const d = graph.addPoint({ x: 400, y: 0 });

  graph.connect(a, b);
  graph.connect(b, c);

  return { graph, a, b, c, d };
};

describe('createWaypointPathPlanner', () => {
  it('walks from the unit to the nearest point, along the route, and on to the target', () => {
    const { graph } = createRoad();
    const planner = createWaypointPathPlanner(graph);
    const from = { x: -5, y: 8 };
    const to = { x: 210, y: -6 };

    const result = planner.planPath(from, to);

    expect(result.status).toBe('found');
    expect(result.points).toEqual([
      from,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      to,
    ]);
    expect(result.expanded).toBe(2);
    expect(result.points[0]).not.toBe(from);
  });

  it('ends at the reached point nearest the target when the route does not reach it', () => {
    const { graph } = createRoad();
    const planner = createWaypointPathPlanner(graph);
    const from = { x: -5, y: 8 };

    const result = planner.planPath(from, { x: 390, y: 0 });

    expect(result.status).toBe('unreachable');
    expect(result.points).toEqual([
      from,
      ...[0, 100, 200].map((x) => ({ x, y: 0 })),
    ]);
  });

  it('is empty when the graph has no enabled point', () => {
    const graph = createWaypointGraph();
    const planner = createWaypointPathPlanner(graph);

    expect(planner.planPath({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({
      status: 'unreachable',
      points: [],
      expanded: 0,
    });
  });

  it('builds a cut-short path, unless keepPartialPath is false', () => {
    const { graph } = createRoad();
    const planner = createWaypointPathPlanner(graph);
    const from = { x: -5, y: 8 };
    const to = { x: 210, y: -6 };

    const kept = planner.planPath(from, to, { maxExpanded: 1 });

    expect(kept.status).toBe('limitReached');
    expect(kept.points[0]).toEqual(from);
    expect(kept.points.length).toBeGreaterThanOrEqual(2);

    expect(
      planner.planPath(from, to, { maxExpanded: 1, keepPartialPath: false }),
    ).toEqual({ status: 'limitReached', points: [], expanded: 1 });

    expect(planner.planPath(from, to, { keepPartialPath: false })).toEqual(
      planner.planPath(from, to),
    );
  });

  it("follows the graph's version", () => {
    const { graph, b } = createRoad();
    const planner = createWaypointPathPlanner(graph);
    const before = planner.version;

    graph.setEnabled(b, false);

    expect(planner.version).toBe(graph.version);
    expect(planner.version).not.toBe(before);
  });

  it('defaults maxPathDistance to Infinity and checks it', () => {
    const { graph } = createRoad();

    expect(createWaypointPathPlanner(graph).maxPathDistance).toBe(Infinity);
    expect(
      createWaypointPathPlanner(graph, { maxPathDistance: 30 }).maxPathDistance,
    ).toBe(30);
    expect(() =>
      createWaypointPathPlanner(graph, { maxPathDistance: -1 }),
    ).toThrow(/maxPathDistance/);
  });
});
