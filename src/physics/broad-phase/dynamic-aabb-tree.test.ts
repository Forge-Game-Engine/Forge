import { describe, expect, it } from 'vitest';
import { Random, Vector2 } from '../../math/index.js';
import * as physics from '../index.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { segmentReachesBox } from '../collision/flat-bounds.js';
import { Aabb } from '../types/aabb.js';
import { aabbMargin, DynamicAabbTree } from './dynamic-aabb-tree.js';

function box(minX: number, minY: number, maxX: number, maxY: number): Aabb {
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

function grow(aabb: Aabb, amount: number): Aabb {
  return box(
    aabb.min.x - amount,
    aabb.min.y - amount,
    aabb.max.x + amount,
    aabb.max.y + amount,
  );
}

function emptyBox(): Aabb {
  return box(0, 0, 0, 0);
}

function queryIds<T>(tree: DynamicAabbTree<T>, aabb: Aabb): number[] {
  const ids: number[] = [];

  tree.query(aabb, (proxyId) => {
    ids.push(proxyId);

    return true;
  });

  return ids.sort((a, b) => a - b);
}

function raycastIds<T>(
  tree: DynamicAabbTree<T>,
  start: Vector2,
  end: Vector2,
): number[] {
  const ids: number[] = [];

  tree.raycast(start, end, (proxyId, maxFraction) => {
    ids.push(proxyId);

    return maxFraction;
  });

  return ids.sort((a, b) => a - b);
}

function segmentReaches(aabb: Aabb, start: Vector2, end: Vector2): boolean {
  return segmentReachesBox(
    new Float64Array([aabb.min.x, aabb.min.y, aabb.max.x, aabb.max.y]),
    0,
    start.x,
    start.y,
    end.x - start.x,
    end.y - start.y,
    1,
  );
}

/**
 * The fraction of the segment from `start` to `end` at which it enters
 * `aabb` (`0` if it starts inside), or `null` if it misses.
 */
function entryFraction(
  aabb: Aabb,
  start: Vector2,
  end: Vector2,
): number | null {
  let tMin = 0;
  let tMax = 1;

  for (const axis of ['x', 'y'] as const) {
    const delta = end[axis] - start[axis];

    if (delta === 0) {
      if (start[axis] < aabb.min[axis] || start[axis] > aabb.max[axis]) {
        return null;
      }

      continue;
    }

    const tA = (aabb.min[axis] - start[axis]) / delta;
    const tB = (aabb.max[axis] - start[axis]) / delta;

    tMin = Math.max(tMin, Math.min(tA, tB));
    tMax = Math.min(tMax, Math.max(tA, tB));
  }

  return tMin <= tMax ? tMin : null;
}

function expectBoxCloseTo(actual: Aabb, expected: Aabb): void {
  expect(actual.min.x).toBeCloseTo(expected.min.x, 12);
  expect(actual.min.y).toBeCloseTo(expected.min.y, 12);
  expect(actual.max.x).toBeCloseTo(expected.max.x, 12);
  expect(actual.max.y).toBeCloseTo(expected.max.y, 12);
}

function maxHeightFor(proxyCount: number): number {
  return 4 * Math.ceil(Math.log2(proxyCount + 1));
}

describe('DynamicAabbTree', () => {
  describe('creating, reading and destroying proxies', () => {
    it('starts empty', () => {
      const tree = new DynamicAabbTree<string>();

      expect(tree.proxyCount).toBe(0);
      expect(tree.height).toBe(0);
      expect(
        queryIds(tree, box(-Infinity, -Infinity, Infinity, Infinity)),
      ).toEqual([]);
      tree.validate();
    });

    it('stores each proxy with its value and its box grown by the margin', () => {
      const tree = new DynamicAabbTree<string>();
      const a = tree.createProxy(box(0, 0, 1, 1), 'a');

      tree.validate();

      const b = tree.createProxy(box(5, 5, 6, 8), 'b');

      tree.validate();

      expect(a).not.toBe(b);
      expect(tree.proxyCount).toBe(2);
      expect(tree.height).toBe(1);
      expect(tree.getValue(a)).toBe('a');
      expect(tree.getValue(b)).toBe('b');
      expectBoxCloseTo(
        tree.getFatAabb(b, emptyBox()),
        grow(box(5, 5, 6, 8), aabbMargin),
      );
    });

    it('writes the fat box into out and returns it', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(1, 2, 3, 4), 7);
      const out = emptyBox();
      const { min, max } = out;

      expect(tree.getFatAabb(proxy, out)).toBe(out);
      expect(out.min).toBe(min);
      expect(out.max).toBe(max);
      expectBoxCloseTo(out, grow(box(1, 2, 3, 4), aabbMargin));
    });

    it('accepts a point box', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(3, 3, 3, 3), 1);

      expect(queryIds(tree, box(3.05, 3.05, 3.05, 3.05))).toEqual([proxy]);
    });

    it('removes a destroyed proxy, leaving the others', () => {
      const tree = new DynamicAabbTree<number>();
      const a = tree.createProxy(box(0, 0, 1, 1), 1);
      const b = tree.createProxy(box(2, 0, 3, 1), 2);
      const c = tree.createProxy(box(4, 0, 5, 1), 3);

      tree.destroyProxy(b);
      tree.validate();

      expect(tree.proxyCount).toBe(2);
      expect(queryIds(tree, box(-10, -10, 10, 10))).toEqual([a, c]);
      expect(() => tree.getValue(b)).toThrow("proxy 1 isn't a live proxy");

      tree.destroyProxy(a);
      tree.validate();
      tree.destroyProxy(c);
      tree.validate();

      expect(tree.proxyCount).toBe(0);
      expect(tree.height).toBe(0);
    });

    it('lets a value be undefined', () => {
      const tree = new DynamicAabbTree<string | undefined>();
      const proxy = tree.createProxy(box(0, 0, 1, 1), undefined);

      tree.validate();

      expect(tree.getValue(proxy)).toBeUndefined();
    });
  });

  describe('moveProxy', () => {
    it('changes nothing while the box stays within the margin', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(0, 0, 1, 1), 1);
      const fat = tree.getFatAabb(proxy, emptyBox());

      expect(tree.moveProxy(proxy, box(0.05, -0.05, 1.05, 0.95))).toBe(false);
      expect(tree.getFatAabb(proxy, emptyBox())).toEqual(fat);
      tree.validate();
    });

    it('reinserts the proxy with a fresh fat box once it leaves the margin', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(0, 0, 1, 1), 1);

      tree.createProxy(box(10, 10, 11, 11), 2);

      const moved = box(0.15, 0, 1.15, 1);

      expect(tree.moveProxy(proxy, moved)).toBe(true);
      tree.validate();
      expectBoxCloseTo(
        tree.getFatAabb(proxy, emptyBox()),
        grow(moved, aabbMargin),
      );
      expect(tree.getValue(proxy)).toBe(1);
    });

    it('rebuilds a fat box that grew far larger than its shape', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(0, 0, 10, 1), 1);

      // Shrinking a side by less than four margins keeps the fat box.
      expect(tree.moveProxy(proxy, box(0, 0, 10 - 3.5 * aabbMargin, 1))).toBe(
        false,
      );

      // Shrinking it by more rebuilds it.
      const shrunk = box(0, 0, 10 - 4.5 * aabbMargin, 1);

      expect(tree.moveProxy(proxy, shrunk)).toBe(true);
      expectBoxCloseTo(
        tree.getFatAabb(proxy, emptyBox()),
        grow(shrunk, aabbMargin),
      );
      tree.validate();
    });

    it('keeps a resting thin shape in place', () => {
      const tree = new DynamicAabbTree<number>();
      const rod = box(0, 0, 10, 0);
      const proxy = tree.createProxy(rod, 1);

      expect(tree.moveProxy(proxy, rod)).toBe(false);
    });
  });

  describe('query', () => {
    const tree = new DynamicAabbTree<string>();
    const left = tree.createProxy(box(0, 0, 1, 1), 'left');
    const right = tree.createProxy(box(4, 0, 5, 1), 'right');
    const below = tree.createProxy(box(0, 4, 1, 5), 'below');

    it('visits every proxy whose fat box overlaps the box', () => {
      expect(queryIds(tree, box(0.5, 0.5, 4.5, 0.6))).toEqual([left, right]);
      expect(queryIds(tree, box(2, 2, 3, 3))).toEqual([]);
      expect(queryIds(tree, box(-1, -1, 6, 6))).toEqual([left, right, below]);
    });

    it('passes each proxy its value', () => {
      const values: string[] = [];

      tree.query(box(0, 3, 1, 6), (_proxyId, value) => {
        values.push(value);

        return true;
      });

      expect(values).toEqual(['below']);
    });

    it('counts touching the fat box as overlapping', () => {
      const edge = 1 + aabbMargin;

      expect(queryIds(tree, box(edge, 0, edge + 1, 1))).toEqual([left]);
      expect(queryIds(tree, box(edge + 0.01, 0, edge + 1, 1))).toEqual([]);
    });

    it('accepts an infinite box', () => {
      expect(queryIds(tree, box(-Infinity, -Infinity, Infinity, 2))).toEqual([
        left,
        right,
      ]);
    });

    it('stops when the callback returns false', () => {
      let calls = 0;

      tree.query(box(-10, -10, 10, 10), () => {
        calls++;

        return false;
      });

      expect(calls).toBe(1);
    });

    it('throws for a box with min > max or NaN', () => {
      expect(() => tree.query(box(1, 0, 0, 1), () => true)).toThrow(
        'DynamicAabbTree.query: box min (1, 0) max (0, 1) must have min <= max.',
      );
      expect(() => tree.query(box(0, NaN, 1, 1), () => true)).toThrow(
        'must have min <= max',
      );
    });
  });

  describe('raycast', () => {
    const tree = new DynamicAabbTree<string>();
    const near = tree.createProxy(box(2, -1, 3, 1), 'near');
    const far = tree.createProxy(box(6, -1, 7, 1), 'far');
    const off = tree.createProxy(box(4, 5, 5, 6), 'off');

    it('visits every proxy whose fat box the segment reaches', () => {
      expect(raycastIds(tree, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual([
        near,
        far,
      ]);
      expect(raycastIds(tree, { x: 0, y: 3 }, { x: 10, y: 3 })).toEqual([]);
      expect(raycastIds(tree, { x: 4.5, y: -10 }, { x: 4.5, y: 10 })).toEqual([
        off,
      ]);
    });

    it('treats a zero-length segment as a point', () => {
      expect(raycastIds(tree, { x: 2.5, y: 0 }, { x: 2.5, y: 0 })).toEqual([
        near,
      ]);
      expect(raycastIds(tree, { x: 4, y: 0 }, { x: 4, y: 0 })).toEqual([]);
    });

    it('counts a segment along a fat box edge', () => {
      const edge = 1 + aabbMargin;

      expect(raycastIds(tree, { x: 0, y: edge }, { x: 10, y: edge })).toEqual([
        near,
        far,
      ]);
    });

    it('passes the current max fraction and the value', () => {
      const calls: [number, string][] = [];

      tree.raycast({ x: 4.5, y: 0 }, { x: 4.5, y: 10 }, (_id, max, value) => {
        calls.push([max, value]);

        return max;
      });

      expect(calls).toEqual([[1, 'off']]);
    });

    it('stops when the callback returns 0', () => {
      let calls = 0;

      tree.raycast({ x: 0, y: 0 }, { x: 10, y: 0 }, () => {
        calls++;

        return 0;
      });

      expect(calls).toBe(1);
    });

    it('skips proxies beyond a clipped segment', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      const visited: string[] = [];

      // Whichever proxy comes first, clipping at the near one rules out the
      // far one.
      tree.raycast(start, end, (proxyId, maxFraction, value) => {
        visited.push(value);

        const fraction = entryFraction(
          tree.getFatAabb(proxyId, emptyBox()),
          start,
          end,
        );

        return fraction !== null && fraction < maxFraction
          ? fraction
          : maxFraction;
      });

      expect(visited).toContain('near');
      expect(visited.indexOf('far')).toBeLessThan(visited.indexOf('near'));
    });

    it('throws for a callback result outside [0, maxFraction]', () => {
      for (const result of [-0.5, 1.5, NaN]) {
        expect(() =>
          tree.raycast({ x: 0, y: 0 }, { x: 10, y: 0 }, () => result),
        ).toThrow(`returned ${result}, but must return 0`);
      }

      expect(raycastIds(tree, { x: 0, y: 0 }, { x: 10, y: 0 })).toHaveLength(2);
    });

    it('throws for a segment that is not finite', () => {
      expect(() =>
        tree.raycast({ x: 0, y: NaN }, { x: 1, y: 0 }, () => 1),
      ).toThrow(
        'DynamicAabbTree.raycast: segment (0, NaN) to (1, 0) must be finite.',
      );
      expect(() =>
        tree.raycast({ x: 0, y: 0 }, { x: Infinity, y: 0 }, () => 1),
      ).toThrow('must be finite');
    });
  });

  describe('errors', () => {
    it('throws for boxes that are not finite or have min > max', () => {
      const tree = new DynamicAabbTree<number>();

      expect(() => tree.createProxy(box(3, NaN, 4, 5), 1)).toThrow(
        'DynamicAabbTree.createProxy: box min (3, NaN) max (4, 5) must be finite with min <= max.',
      );
      expect(() => tree.createProxy(box(0, 0, Infinity, 1), 1)).toThrow(
        'must be finite',
      );
      expect(() =>
        tree.createProxy(box(Infinity, Infinity, -Infinity, -Infinity), 1),
      ).toThrow('must be finite');
      expect(() => tree.createProxy(box(0, 2, 1, 1), 1)).toThrow(
        'must be finite',
      );

      const proxy = tree.createProxy(box(0, 0, 1, 1), 1);

      expect(() => tree.moveProxy(proxy, box(2, 0, 1, 1))).toThrow(
        'DynamicAabbTree.moveProxy: box min (2, 0) max (1, 1) must be finite with min <= max.',
      );
      expect(tree.proxyCount).toBe(1);
      tree.validate();
    });

    it('throws for ids that are not live proxies', () => {
      const tree = new DynamicAabbTree<number>();
      const a = tree.createProxy(box(0, 0, 1, 1), 1);
      const b = tree.createProxy(box(2, 0, 3, 1), 2);
      // The node holding both leaves.
      const internal = [0, 1, 2].find((id) => id !== a && id !== b) ?? -1;

      for (const id of [-1, 1.5, 1000, NaN, internal]) {
        expect(() => tree.destroyProxy(id)).toThrow(
          `DynamicAabbTree.destroyProxy: proxy ${id} isn't a live proxy.`,
        );
        expect(() => tree.moveProxy(id, box(0, 0, 1, 1))).toThrow(
          "isn't a live proxy",
        );
        expect(() => tree.getFatAabb(id, emptyBox())).toThrow(
          "isn't a live proxy",
        );
        expect(() => tree.getValue(id)).toThrow("isn't a live proxy");
      }

      tree.destroyProxy(a);

      expect(() => tree.destroyProxy(a)).toThrow("isn't a live proxy");
    });

    it('throws when a callback changes the tree, and stays usable', () => {
      const tree = new DynamicAabbTree<number>();
      const proxy = tree.createProxy(box(0, 0, 1, 1), 1);
      const everything = box(-10, -10, 10, 10);
      const changes: (() => void)[] = [
        () => tree.createProxy(box(0, 0, 1, 1), 2),
        () => tree.destroyProxy(proxy),
        () => tree.moveProxy(proxy, box(5, 5, 6, 6)),
        () => tree.clear(),
      ];

      for (const change of changes) {
        expect(() =>
          tree.query(everything, () => {
            change();

            return true;
          }),
        ).toThrow("can't be changed from inside one of its own query");
        expect(() =>
          tree.raycast({ x: -5, y: 0.5 }, { x: 5, y: 0.5 }, (_id, max) => {
            change();

            return max;
          }),
        ).toThrow("can't be changed from inside one of its own query");
      }

      expect(tree.proxyCount).toBe(1);
      expect(tree.moveProxy(proxy, box(5, 5, 6, 6))).toBe(true);
      tree.validate();
    });

    it('allows a callback to query the same tree', () => {
      const tree = new DynamicAabbTree<number>();
      const a = tree.createProxy(box(0, 0, 1, 1), 1);
      const b = tree.createProxy(box(0.5, 0.5, 2, 2), 2);
      const pairs: [number, number][] = [];

      tree.query(box(-10, -10, 10, 10), (outer) => {
        tree.query(tree.getFatAabb(outer, emptyBox()), (inner) => {
          if (inner !== outer) {
            pairs.push([outer, inner]);
          }

          return true;
        });

        return true;
      });

      expect(pairs.toSorted((x, y) => x[0] - y[0])).toEqual([
        [a, b],
        [b, a],
      ]);
    });
  });

  describe('node reuse', () => {
    it('reuses freed nodes instead of growing the pool', () => {
      const tree = new DynamicAabbTree<number>();
      const random = new Random('node-reuse');
      const count = 50;
      const proxies: number[] = [];

      for (let i = 0; i < count; i++) {
        const x = random.randomFloat(-100, 100);

        proxies.push(tree.createProxy(box(x, 0, x + 1, 1), i));
      }

      // A fresh tree takes nodes in ascending order, and n proxies use
      // 2n - 1 nodes.
      expect(Math.max(...proxies)).toBeLessThan(2 * count - 1);

      for (const proxy of proxies) {
        tree.destroyProxy(proxy);
        tree.validate();
      }

      for (let i = 0; i < count; i++) {
        const x = random.randomFloat(-100, 100);
        const proxy = tree.createProxy(box(x, 0, x + 1, 1), i);

        tree.validate();
        expect(proxy).toBeLessThan(2 * count - 1);
      }
    });

    it('gives a destroyed id to a later proxy', () => {
      const tree = new DynamicAabbTree<string>();
      const a = tree.createProxy(box(0, 0, 1, 1), 'a');

      tree.destroyProxy(a);

      expect(() => tree.getValue(a)).toThrow("isn't a live proxy");
      expect(tree.createProxy(box(5, 5, 6, 6), 'b')).toBe(a);
      expect(tree.getValue(a)).toBe('b');
    });
  });

  describe('clear', () => {
    it('removes every proxy and reuses the nodes', () => {
      const tree = new DynamicAabbTree<number>();
      const proxies: number[] = [];

      for (let i = 0; i < 40; i++) {
        proxies.push(tree.createProxy(box(i, 0, i + 1, 1), i));
      }

      tree.clear();
      tree.validate();

      expect(tree.proxyCount).toBe(0);
      expect(tree.height).toBe(0);
      expect(queryIds(tree, box(-100, -100, 100, 100))).toEqual([]);

      for (const proxy of proxies) {
        expect(() => tree.getValue(proxy)).toThrow("isn't a live proxy");
      }

      for (let i = 0; i < 40; i++) {
        expect(tree.createProxy(box(i, 0, i + 1, 1), i)).toBeLessThan(79);
      }

      tree.validate();
    });
  });

  describe('balance', () => {
    it('stays shallow when boxes arrive in sorted order', () => {
      const tree = new DynamicAabbTree<number>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        tree.createProxy(box(i, 0, i + 1, 1), i);
      }

      tree.validate();

      expect(tree.height).toBeLessThanOrEqual(maxHeightFor(count));
    });

    it('builds the same tree from the same calls', () => {
      const build = (): number[] => {
        const tree = new DynamicAabbTree<number>();
        const random = new Random('determinism');

        for (let i = 0; i < 200; i++) {
          const x = random.randomFloat(-50, 50);
          const y = random.randomFloat(-50, 50);

          tree.createProxy(box(x, y, x + 2, y + 2), i);
        }

        const order: number[] = [];

        tree.query(box(-20, -20, 20, 20), (proxyId) => {
          order.push(proxyId);

          return true;
        });

        return order;
      };

      expect(build()).toEqual(build());
    });
  });

  describe('randomized comparison with a brute-force scan', () => {
    interface Model {
      tight: Aabb;
      fat: Aabb;
    }

    function randomTightBox(random: Random): Aabb {
      const x = random.randomFloat(-100, 100);
      const y = random.randomFloat(-100, 100);
      const shape = random.randomInt(0, 9);

      // Mostly small boxes, with some very wide, very thin and point boxes.
      if (shape === 0) {
        return box(x, y, x + random.randomFloat(30, 120), y + 0.05);
      }

      if (shape === 1) {
        return box(x, y, x + 0.05, y + random.randomFloat(30, 120));
      }

      if (shape === 2) {
        return box(x, y, x, y);
      }

      return box(
        x,
        y,
        x + random.randomFloat(0.1, 6),
        y + random.randomFloat(0.1, 6),
      );
    }

    function offset(aabb: Aabb, dx: number, dy: number): Aabb {
      return box(
        aabb.min.x + dx,
        aabb.min.y + dy,
        aabb.max.x + dx,
        aabb.max.y + dy,
      );
    }

    function fatStillFits(fat: Aabb, tight: Aabb): boolean {
      const limit = 5 * aabbMargin;

      return (
        fat.min.x <= tight.min.x &&
        fat.min.y <= tight.min.y &&
        fat.max.x >= tight.max.x &&
        fat.max.y >= tight.max.y &&
        fat.min.x >= tight.min.x - limit &&
        fat.min.y >= tight.min.y - limit &&
        fat.max.x <= tight.max.x + limit &&
        fat.max.y <= tight.max.y + limit
      );
    }

    function moveRandomly(random: Random, tight: Aabb): Aabb {
      const kind = random.randomInt(0, 2);

      if (kind === 0) {
        const small = aabbMargin * 0.9;

        return offset(
          tight,
          random.randomFloat(-small, small),
          random.randomFloat(-small, small),
        );
      }

      if (kind === 1) {
        return offset(
          tight,
          random.randomFloat(-20, 20),
          random.randomFloat(-20, 20),
        );
      }

      // Shrink towards the box's top-left corner.
      return box(
        tight.min.x,
        tight.min.y,
        tight.min.x + (tight.max.x - tight.min.x) * random.randomFloat(0, 1),
        tight.min.y + (tight.max.y - tight.min.y) * random.randomFloat(0, 1),
      );
    }

    function compareWithBruteForce(
      random: Random,
      tree: DynamicAabbTree<number>,
      models: Map<number, Model>,
    ): void {
      const queryMin = {
        x: random.randomFloat(-120, 120),
        y: random.randomFloat(-120, 120),
      };
      const queryBox = box(
        queryMin.x,
        queryMin.y,
        queryMin.x + random.randomFloat(0, 40),
        queryMin.y + random.randomFloat(0, 40),
      );
      const expectedQuery = [...models]
        .filter(([, model]) => aabbsOverlap(model.fat, queryBox))
        .map(([id]) => id)
        .sort((a, b) => a - b);

      expect(queryIds(tree, queryBox)).toEqual(expectedQuery);

      const start = {
        x: random.randomFloat(-120, 120),
        y: random.randomFloat(-120, 120),
      };
      const end = {
        x: random.randomFloat(-120, 120),
        y: random.randomFloat(-120, 120),
      };
      const expectedRay = [...models]
        .filter(([, model]) => segmentReaches(model.fat, start, end))
        .map(([id]) => id)
        .sort((a, b) => a - b);

      expect(raycastIds(tree, start, end)).toEqual(expectedRay);

      // A closest-hit cast that clips at each entry ends at the smallest
      // entry fraction, and never visits a box beyond the clipped segment.
      let closest = Infinity;

      for (const model of models.values()) {
        const fraction = entryFraction(model.fat, start, end);

        if (fraction !== null) {
          closest = Math.min(closest, fraction);
        }
      }

      let found = Infinity;

      tree.raycast(start, end, (proxyId, maxFraction) => {
        const model = models.get(proxyId);

        expect(model).toBeDefined();

        const fraction = model ? entryFraction(model.fat, start, end) : null;

        expect(fraction).not.toBeNull();
        expect(fraction ?? Infinity).toBeLessThanOrEqual(maxFraction + 1e-9);

        if (fraction === null || fraction >= maxFraction) {
          return maxFraction;
        }

        found = fraction;

        return fraction;
      });

      expect(found).toBe(closest);
    }

    for (const seed of ['alpha', 'bravo', 'charlie']) {
      it(`matches a brute-force scan over random operations (seed ${seed})`, () => {
        const random = new Random(seed);
        const tree = new DynamicAabbTree<number>();
        const models = new Map<number, Model>();
        const operations = 2500;

        for (let step = 0; step < operations; step++) {
          const ids = [...models.keys()];
          const action = random.randomInt(0, 9);

          if (ids.length === 0 || (action < 4 && ids.length < 300)) {
            const tight = randomTightBox(random);
            const id = tree.createProxy(tight, step);

            expect(models.has(id)).toBe(false);
            models.set(id, { tight, fat: grow(tight, aabbMargin) });
          } else if (action < 6) {
            const id = ids[random.randomInt(0, ids.length - 1)];

            tree.destroyProxy(id);
            models.delete(id);
          } else {
            const id = ids[random.randomInt(0, ids.length - 1)];
            const model = models.get(id);

            if (!model) {
              throw new Error(`No model for proxy ${id}.`);
            }

            const tight = moveRandomly(random, model.tight);
            const expectChange = !fatStillFits(model.fat, tight);

            expect(tree.moveProxy(id, tight)).toBe(expectChange);
            models.set(id, {
              tight,
              fat: expectChange ? grow(tight, aabbMargin) : model.fat,
            });
          }

          tree.validate();
          expect(tree.proxyCount).toBe(models.size);

          const fat = emptyBox();
          const wrongFatBoxes = [...models].filter(([id, model]) => {
            tree.getFatAabb(id, fat);

            return (
              fat.min.x !== model.fat.min.x ||
              fat.min.y !== model.fat.min.y ||
              fat.max.x !== model.fat.max.x ||
              fat.max.y !== model.fat.max.y ||
              !fatStillFits(fat, model.tight)
            );
          });

          expect(wrongFatBoxes).toEqual([]);

          compareWithBruteForce(random, tree, models);
        }

        expect(tree.height).toBeLessThanOrEqual(maxHeightFor(tree.proxyCount));
      });
    }
  });

  it('is exported from the physics module', () => {
    expect(physics.DynamicAabbTree).toBe(DynamicAabbTree);
    expect(physics.aabbMargin).toBe(aabbMargin);
  });
});
