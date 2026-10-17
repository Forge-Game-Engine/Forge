import { describe, expect, it } from 'vitest';
import { Random, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { EdgeTree } from './edge-tree.js';

interface Segment {
  start: Vector2;
  end: Vector2;
}

function segmentBounds({ start, end }: Segment): Aabb {
  return {
    min: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    max: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
  };
}

function randomSegments(random: Random, count: number): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i < count; i++) {
    const start = {
      x: random.randomFloat(-100, 100),
      y: random.randomFloat(-100, 100),
    };

    segments.push({
      start,
      end: {
        x: start.x + random.randomFloat(-20, 20),
        y: start.y + random.randomFloat(-20, 20),
      },
    });
  }

  return segments;
}

function randomBox(random: Random): Aabb {
  const x = random.randomFloat(-140, 140);
  const y = random.randomFloat(-140, 140);

  return {
    min: { x, y },
    max: {
      x: x + random.randomFloat(0, 60),
      y: y + random.randomFloat(0, 60),
    },
  };
}

function bruteForceBounds(bounds: readonly Aabb[], box: Aabb): number[] {
  const result: number[] = [];

  bounds.forEach((itemBounds, index) => {
    if (
      itemBounds.min.x <= box.max.x &&
      itemBounds.max.x >= box.min.x &&
      itemBounds.min.y <= box.max.y &&
      itemBounds.max.y >= box.min.y
    ) {
      result.push(index);
    }
  });

  return result;
}

function segmentReachesBox(start: Vector2, end: Vector2, box: Aabb): boolean {
  let tMin = 0;
  let tMax = 1;

  for (const axis of ['x', 'y'] as const) {
    const delta = end[axis] - start[axis];

    if (delta === 0) {
      if (start[axis] < box.min[axis] || start[axis] > box.max[axis]) {
        return false;
      }

      continue;
    }

    const tA = (box.min[axis] - start[axis]) / delta;
    const tB = (box.max[axis] - start[axis]) / delta;

    tMin = Math.max(tMin, Math.min(tA, tB));
    tMax = Math.min(tMax, Math.max(tA, tB));
  }

  return tMin <= tMax;
}

function bruteForceSegment(
  bounds: readonly Aabb[],
  start: Vector2,
  end: Vector2,
): number[] {
  const result: number[] = [];

  bounds.forEach((itemBounds, index) => {
    if (segmentReachesBox(start, end, itemBounds)) {
      result.push(index);
    }
  });

  return result;
}

describe('EdgeTree', () => {
  it('returns nothing for an empty tree', () => {
    const tree = new EdgeTree([]);

    expect(
      tree.queryBounds({ min: { x: -1, y: -1 }, max: { x: 1, y: 1 } }),
    ).toEqual([]);
    expect(tree.querySegment({ x: 0, y: 0 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('finds a single item', () => {
    const tree = new EdgeTree([{ min: { x: 0, y: 0 }, max: { x: 1, y: 0 } }]);

    expect(
      tree.queryBounds({ min: { x: 1, y: 0 }, max: { x: 2, y: 1 } }),
    ).toEqual([0]);
    expect(
      tree.queryBounds({ min: { x: 1.1, y: 0 }, max: { x: 2, y: 1 } }),
    ).toEqual([]);
  });

  it.each([1, 3, 4, 5, 17, 200])(
    'matches a brute-force scan for random boxes over %i random edges',
    (count) => {
      const random = new Random(`edge-tree-boxes-${count}`);
      const bounds = randomSegments(random, count).map(segmentBounds);
      const tree = new EdgeTree(bounds);

      for (let i = 0; i < 200; i++) {
        const box = randomBox(random);

        expect(tree.queryBounds(box)).toEqual(bruteForceBounds(bounds, box));
      }
    },
  );

  it.each([1, 4, 5, 17, 200])(
    'matches a brute-force scan for random segments over %i random edges',
    (count) => {
      const random = new Random(`edge-tree-segments-${count}`);
      const bounds = randomSegments(random, count).map(segmentBounds);
      const tree = new EdgeTree(bounds);

      for (let i = 0; i < 200; i++) {
        const start = {
          x: random.randomFloat(-140, 140),
          y: random.randomFloat(-140, 140),
        };
        const end = {
          x: random.randomFloat(-140, 140),
          y: random.randomFloat(-140, 140),
        };

        expect(tree.querySegment(start, end)).toEqual(
          bruteForceSegment(bounds, start, end),
        );
      }
    },
  );

  it('handles axis-aligned and zero-length segments', () => {
    const random = new Random('edge-tree-axis-aligned');
    const bounds = randomSegments(random, 60).map(segmentBounds);
    const tree = new EdgeTree(bounds);
    const segments: Segment[] = [
      { start: { x: -150, y: 0 }, end: { x: 150, y: 0 } },
      { start: { x: 10, y: -150 }, end: { x: 10, y: 150 } },
      { start: { x: 5, y: 5 }, end: { x: 5, y: 5 } },
    ];

    for (const { start, end } of segments) {
      expect(tree.querySegment(start, end)).toEqual(
        bruteForceSegment(bounds, start, end),
      );
    }
  });

  it('finds long edges that span the whole set', () => {
    const random = new Random('edge-tree-long-edges');
    const segments = [
      ...randomSegments(random, 50),
      { start: { x: -100, y: 0 }, end: { x: 100, y: 0 } },
      { start: { x: 0, y: -100 }, end: { x: 0, y: 100 } },
    ];
    const bounds = segments.map(segmentBounds);
    const tree = new EdgeTree(bounds);

    for (let i = 0; i < 100; i++) {
      const box = randomBox(random);

      expect(tree.queryBounds(box)).toEqual(bruteForceBounds(bounds, box));
    }
  });

  it('handles many collinear edges', () => {
    const segments: Segment[] = [];

    for (let i = 0; i < 64; i++) {
      segments.push({ start: { x: i, y: 0 }, end: { x: i + 1, y: 0 } });
    }

    const bounds = segments.map(segmentBounds);
    const tree = new EdgeTree(bounds);

    expect(
      tree.queryBounds({ min: { x: 10.5, y: -1 }, max: { x: 12, y: 1 } }),
    ).toEqual([10, 11, 12]);
    expect(
      tree.queryBounds({
        min: { x: 3.5, y: -Infinity },
        max: { x: 4.5, y: Infinity },
      }),
    ).toEqual([3, 4]);
    expect(tree.querySegment({ x: 20.5, y: -1 }, { x: 20.5, y: 1 })).toEqual([
      20,
    ]);
  });
});
