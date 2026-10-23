import { beforeEach, describe, expect, it } from 'vitest';
import { createWaypointGraph } from './create-waypoint-graph.js';
import { WaypointGraph } from './waypoint-graph.js';

/** Every step out of a node, as `[neighbor, cost]`. */
const stepsFrom = (
  graph: WaypointGraph,
  node: number,
): [neighbor: number, cost: number][] => {
  const steps: [number, number][] = [];

  graph.forEachNeighbor(node, (neighbor, cost) => {
    steps.push([neighbor, cost]);
  });

  return steps;
};

describe('AdjacencyListWaypointGraph', () => {
  let graph: WaypointGraph;

  beforeEach(() => {
    graph = createWaypointGraph();
  });

  describe('points', () => {
    it('starts empty', () => {
      expect(graph.nodeCount).toBe(0);
      expect(graph.pointCount).toBe(0);
      expect(graph.version).toBe(0);
      expect(graph.getPointIds()).toEqual([]);
    });

    it('gives ids counting up from 0', () => {
      expect(graph.addPoint({ x: 0, y: 0 })).toBe(0);
      expect(graph.addPoint({ x: 1, y: 0 })).toBe(1);
      expect(graph.addPoint({ x: 2, y: 0 })).toBe(2);
      expect(graph.nodeCount).toBe(3);
      expect(graph.pointCount).toBe(3);
      expect(graph.getPointIds()).toEqual([0, 1, 2]);
    });

    it('adds an enabled point of cost 1 with no connections', () => {
      const id = graph.addPoint({ x: 3, y: 4 });

      expect(graph.hasPoint(id)).toBe(true);
      expect(graph.isEnabled(id)).toBe(true);
      expect(graph.getCost(id)).toBe(1);
      expect(graph.getConnections(id)).toEqual([]);
    });

    it('copies positions in and out', () => {
      const position = { x: 3, y: 4 };
      const id = graph.addPoint(position, 2);

      position.x = 100;

      const read = graph.getPosition(id);

      expect(read).toEqual({ x: 3, y: 4 });

      read.x = 50;

      expect(graph.getPosition(id)).toEqual({ x: 3, y: 4 });
      expect(graph.getCost(id)).toBe(2);
    });

    it('moves a point and sets its cost', () => {
      const id = graph.addPoint({ x: 0, y: 0 });

      graph.setPosition(id, { x: 5, y: -5 });
      graph.setCost(id, 0.5);

      expect(graph.getPosition(id)).toEqual({ x: 5, y: -5 });
      expect(graph.getCost(id)).toBe(0.5);
    });
  });

  describe('removing a point', () => {
    it('removes it and every connection into and out of it', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 1, y: 0 });
      const c = graph.addPoint({ x: 2, y: 0 });
      const d = graph.addPoint({ x: 3, y: 0 });

      graph.connect(a, b);
      graph.connect(b, c);
      // A one-way connection into b from a point b has no connection to.
      graph.connect(d, b, { bidirectional: false });

      graph.removePoint(b);

      expect(graph.hasPoint(b)).toBe(false);
      expect(graph.pointCount).toBe(3);
      expect(graph.getPointIds()).toEqual([a, c, d]);
      expect(graph.getConnections(a)).toEqual([]);
      expect(graph.getConnections(c)).toEqual([]);
      expect(graph.getConnections(d)).toEqual([]);
      expect(stepsFrom(graph, b)).toEqual([]);
    });

    it('reuses freed ids, least recently freed first, with no connections', () => {
      const ids = [0, 1, 2, 3].map((x) => graph.addPoint({ x, y: 0 }));

      graph.connect(ids[0], ids[2]);
      graph.removePoint(ids[2]);
      graph.removePoint(ids[0]);

      expect(graph.nodeCount).toBe(4);

      const first = graph.addPoint({ x: 10, y: 0 });
      const second = graph.addPoint({ x: 20, y: 0 });
      const third = graph.addPoint({ x: 30, y: 0 });

      expect(first).toBe(ids[2]);
      expect(second).toBe(ids[0]);
      expect(third).toBe(4);
      expect(graph.nodeCount).toBe(5);
      expect(graph.getConnections(first)).toEqual([]);
      expect(graph.getConnections(second)).toEqual([]);
      expect(graph.getPosition(first)).toEqual({ x: 10, y: 0 });
    });

    it('keeps reusing ids in the order they were freed across many removals', () => {
      const live: number[] = [];

      for (let x = 0; x < 8; x++) {
        live.push(graph.addPoint({ x, y: 0 }));
      }

      const freed: number[] = [];

      // Remove and re-add in a loop, so the free-id queue is compacted
      // several times along the way.
      for (let round = 0; round < 50; round++) {
        const [id] = live.splice((round * 3) % live.length, 1);

        graph.removePoint(id);
        freed.push(id);

        if (round % 2 === 1) {
          for (let i = 0; i < 2; i++) {
            const added = graph.addPoint({ x: round, y: i });

            expect(added).toBe(freed.shift());
            live.push(added);
          }
        }
      }

      expect(graph.nodeCount).toBe(8);
      expect(graph.pointCount).toBe(8);
    });
  });

  describe('connections', () => {
    let west: number;
    let east: number;

    beforeEach(() => {
      west = graph.addPoint({ x: 0, y: 0 });
      east = graph.addPoint({ x: 3, y: 4 });
    });

    it('connects both ways by default', () => {
      graph.connect(west, east);

      expect(graph.isConnected(west, east)).toBe(true);
      expect(graph.isConnected(east, west)).toBe(true);
    });

    it('connects one way when bidirectional is false', () => {
      graph.connect(west, east, { bidirectional: false });

      expect(graph.isConnected(west, east)).toBe(true);
      expect(graph.isConnected(east, west)).toBe(false);
    });

    it('never removes a way by connecting again', () => {
      graph.connect(west, east);

      const version = graph.version;

      graph.connect(west, east);
      graph.connect(west, east, { bidirectional: false });

      expect(graph.isConnected(west, east)).toBe(true);
      expect(graph.isConnected(east, west)).toBe(true);
      expect(graph.getConnections(west)).toEqual([east]);
      expect(graph.version).toBe(version);
    });

    it('disconnects both ways by default and one way when bidirectional is false', () => {
      graph.connect(west, east);
      graph.disconnect(west, east, { bidirectional: false });

      expect(graph.isConnected(west, east)).toBe(false);
      expect(graph.isConnected(east, west)).toBe(true);

      graph.connect(west, east);
      graph.disconnect(west, east);

      expect(graph.isConnected(west, east)).toBe(false);
      expect(graph.isConnected(east, west)).toBe(false);
    });

    it('ignores disconnecting points that are not connected', () => {
      const version = graph.version;

      graph.disconnect(west, east);

      expect(graph.version).toBe(version);
    });

    it('lists connections in the order they were made', () => {
      const north = graph.addPoint({ x: 10, y: 0 });
      const south = graph.addPoint({ x: 20, y: 0 });

      graph.connect(west, south);
      graph.connect(west, east);
      graph.connect(west, north, { bidirectional: false });

      expect(graph.getConnections(west)).toEqual([south, east, north]);
    });
  });

  describe('enabling', () => {
    it('disables a point without dropping its connections', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 1, y: 0 });

      graph.connect(a, b);
      graph.setEnabled(b, false);

      expect(graph.isEnabled(b)).toBe(false);
      expect(graph.getConnections(b)).toEqual([a]);
      expect(graph.isConnected(a, b)).toBe(true);

      graph.setEnabled(b, true);

      expect(graph.isEnabled(b)).toBe(true);
    });
  });

  describe('closestPoint', () => {
    it('returns null for an empty graph and one with every point disabled', () => {
      expect(graph.closestPoint({ x: 0, y: 0 })).toBeNull();

      const a = graph.addPoint({ x: 0, y: 0 });

      graph.setEnabled(a, false);

      expect(graph.closestPoint({ x: 0, y: 0 })).toBeNull();
    });

    it('finds the nearest enabled point, skipping a nearer disabled one', () => {
      const far = graph.addPoint({ x: 10, y: 0 });
      const near = graph.addPoint({ x: 1, y: 0 });

      expect(graph.closestPoint({ x: 0, y: 0 })).toBe(near);

      graph.setEnabled(near, false);

      expect(graph.closestPoint({ x: 0, y: 0 })).toBe(far);
    });

    it('returns the lowest id on a tie', () => {
      graph.addPoint({ x: 5, y: 5 });

      const left = graph.addPoint({ x: -1, y: 0 });
      const right = graph.addPoint({ x: 1, y: 0 });

      expect(graph.closestPoint({ x: 0, y: 0 })).toBe(Math.min(left, right));
    });

    it('skips removed points', () => {
      const near = graph.addPoint({ x: 1, y: 0 });
      const far = graph.addPoint({ x: 10, y: 0 });

      graph.removePoint(near);

      expect(graph.closestPoint({ x: 0, y: 0 })).toBe(far);
    });
  });

  describe('version', () => {
    it('increases once for each call that changes the graph', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 1, y: 0 });

      expect(graph.version).toBe(2);

      graph.connect(a, b);
      expect(graph.version).toBe(3);

      graph.disconnect(a, b);
      expect(graph.version).toBe(4);

      graph.setEnabled(a, false);
      expect(graph.version).toBe(5);

      graph.setCost(a, 2);
      expect(graph.version).toBe(6);

      graph.setPosition(a, { x: 1, y: 1 });
      expect(graph.version).toBe(7);

      graph.removePoint(b);
      expect(graph.version).toBe(8);
    });

    it('stays the same for calls that change nothing', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 2);
      const version = graph.version;

      graph.setEnabled(a, true);
      graph.setCost(a, 2);
      graph.setPosition(a, { x: 0, y: 0 });

      expect(graph.version).toBe(version);
    });
  });

  describe('steps', () => {
    it('costs the distance times the entered point cost', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 5);
      const b = graph.addPoint({ x: 3, y: 4 }, 2);

      graph.connect(a, b);

      expect(stepsFrom(graph, a)).toEqual([[b, 10]]);
      expect(stepsFrom(graph, b)).toEqual([[a, 25]]);
    });

    it('never enters a disabled point but steps out of one', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 3, y: 4 });

      graph.connect(a, b);
      graph.setEnabled(b, false);

      expect(stepsFrom(graph, a)).toEqual([]);
      expect(stepsFrom(graph, b)).toEqual([[a, 5]]);
    });

    it('follows a moved point', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 3, y: 4 });

      graph.connect(a, b);
      graph.setPosition(b, { x: 6, y: 8 });

      expect(stepsFrom(graph, a)).toEqual([[b, 10]]);
    });
  });

  describe('heuristic', () => {
    it('is the straight-line distance at cost 1', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 3, y: 4 });

      expect(graph.heuristic(a, b)).toBe(5);
    });

    it('uses the lowest cost of a new graph whose points all cost more than 1', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 2);
      const b = graph.addPoint({ x: 3, y: 4 }, 3);

      expect(graph.heuristic(a, b)).toBe(10);
    });

    it('lowers at once when a cost drops below the lowest', () => {
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 3, y: 4 });

      expect(graph.heuristic(a, b)).toBe(5);

      graph.setCost(b, 0.5);

      expect(graph.heuristic(a, b)).toBe(2.5);

      graph.addPoint({ x: 100, y: 0 }, 0.25);

      expect(graph.heuristic(a, b)).toBe(1.25);
    });

    it('rises when the only cheapest point gets dearer', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 2);
      const b = graph.addPoint({ x: 3, y: 4 }, 0.5);

      expect(graph.heuristic(a, b)).toBe(2.5);

      graph.setCost(b, 4);

      expect(graph.heuristic(a, b)).toBe(10);
    });

    it('stops counting a removed point, whose cost stays in its freed slot', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 2);
      const b = graph.addPoint({ x: 3, y: 4 }, 2);
      const cheap = graph.addPoint({ x: 100, y: 0 }, 0.5);

      expect(graph.heuristic(a, b)).toBe(2.5);

      graph.removePoint(cheap);

      expect(graph.heuristic(a, b)).toBe(10);
    });

    it('uses the cost of the one point added after every point was removed', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 0.5);

      expect(graph.heuristic(a, a)).toBe(0);

      graph.removePoint(a);

      const b = graph.addPoint({ x: 0, y: 0 }, 3);
      const c = graph.addPoint({ x: 3, y: 4 }, 3);

      expect(graph.heuristic(b, c)).toBe(15);
    });

    it('counts disabled points', () => {
      const a = graph.addPoint({ x: 0, y: 0 }, 2);
      const b = graph.addPoint({ x: 3, y: 4 }, 0.5);

      graph.setEnabled(b, false);

      expect(graph.heuristic(a, b)).toBe(2.5);
    });
  });

  describe('validation', () => {
    it.each([-1, 0.5, 3, NaN, Infinity])(
      'throws for id %s, which is not a point',
      (id) => {
        graph.addPoint({ x: 0, y: 0 });
        graph.addPoint({ x: 1, y: 0 });

        expect(graph.hasPoint(id)).toBe(false);
        expect(() => graph.removePoint(id)).toThrow(/waypoint/);
        expect(() => graph.getPosition(id)).toThrow(/waypoint/);
        expect(() => graph.setPosition(id, { x: 0, y: 0 })).toThrow(/waypoint/);
        expect(() => graph.getCost(id)).toThrow(/waypoint/);
        expect(() => graph.setCost(id, 1)).toThrow(/waypoint/);
        expect(() => graph.isEnabled(id)).toThrow(/waypoint/);
        expect(() => graph.setEnabled(id, true)).toThrow(/waypoint/);
        expect(() => graph.connect(0, id)).toThrow(/waypoint/);
        expect(() => graph.connect(id, 0)).toThrow(/waypoint/);
        expect(() => graph.disconnect(0, id)).toThrow(/waypoint/);
        expect(() => graph.isConnected(id, 0)).toThrow(/waypoint/);
        expect(() => graph.getConnections(id)).toThrow(/waypoint/);
      },
    );

    it('throws for a removed point', () => {
      const a = graph.addPoint({ x: 0, y: 0 });

      graph.removePoint(a);

      expect(() => graph.removePoint(a)).toThrow(
        "Unable to remove waypoint 0, it isn't a point of the graph.",
      );
      expect(() => graph.getPosition(a)).toThrow(/waypoint 0/);
    });

    it('throws for connecting a point to itself', () => {
      const a = graph.addPoint({ x: 0, y: 0 });

      expect(() => graph.connect(a, a)).toThrow(/itself/);
    });

    it.each([
      { x: NaN, y: 0 },
      { x: 0, y: Infinity },
    ])('throws for the position %o', (position) => {
      const a = graph.addPoint({ x: 0, y: 0 });

      expect(() => graph.addPoint(position)).toThrow(/isn't finite/);
      expect(() => graph.setPosition(a, position)).toThrow(/isn't finite/);
      expect(() => graph.closestPoint(position)).toThrow(/isn't finite/);
    });

    it.each([0, -1, NaN, Infinity])('throws for the cost %s', (cost) => {
      const a = graph.addPoint({ x: 0, y: 0 });

      expect(() => graph.addPoint({ x: 0, y: 0 }, cost)).toThrow(
        /finite and more than 0/,
      );
      expect(() => graph.setCost(a, cost)).toThrow(/finite and more than 0/);
      expect(graph.pointCount).toBe(1);
    });
  });
});
