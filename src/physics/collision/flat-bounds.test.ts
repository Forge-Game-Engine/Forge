import { describe, expect, it } from 'vitest';
import { Random } from '../../math/index.js';
import { boxesOverlap, segmentReachesBox } from './flat-bounds.js';

const box = new Float64Array([0, 0, 10, 10]);

/**
 * Whether any of many evenly spaced points on the segment lies in the box,
 * an independent (if approximate) check of the slab test.
 */
function sampledSegmentReachesBox(
  bounds: Float64Array,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
  maxFraction: number,
): boolean {
  const samples = 2000;

  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * maxFraction;
    const x = startX + t * deltaX;
    const y = startY + t * deltaY;

    if (x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3]) {
      return true;
    }
  }

  return false;
}

describe('boxesOverlap', () => {
  it('reports overlapping and separate boxes', () => {
    expect(boxesOverlap(box, 0, 5, 5, 15, 15)).toBe(true);
    expect(boxesOverlap(box, 0, 11, 0, 20, 10)).toBe(false);
    expect(boxesOverlap(box, 0, 0, 11, 10, 20)).toBe(false);
  });

  it('counts touching edges as overlapping', () => {
    expect(boxesOverlap(box, 0, 10, 0, 20, 10)).toBe(true);
    expect(boxesOverlap(box, 0, -5, -5, 0, 0)).toBe(true);
  });

  it('reads the box at the given offset', () => {
    const bounds = new Float64Array([0, 0, 1, 1, 50, 50, 60, 60]);

    expect(boxesOverlap(bounds, 4, 55, 55, 56, 56)).toBe(true);
    expect(boxesOverlap(bounds, 0, 55, 55, 56, 56)).toBe(false);
  });

  it('accepts infinite query boxes', () => {
    expect(boxesOverlap(box, 0, -Infinity, -Infinity, Infinity, 5)).toBe(true);
  });
});

describe('segmentReachesBox', () => {
  it('reports segments through and past the box', () => {
    expect(segmentReachesBox(box, 0, -5, 5, 20, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, -5, -5, 20, 0, 1)).toBe(false);
    expect(segmentReachesBox(box, 0, -5, -5, 30, 30, 1)).toBe(true);
  });

  it('counts a segment touching an edge or a corner', () => {
    expect(segmentReachesBox(box, 0, -5, 0, 20, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, -5, 5, 5, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, 15, -5, -5, 5, 1)).toBe(true);
  });

  it('tests a zero extent on an axis against that slab alone', () => {
    expect(segmentReachesBox(box, 0, 5, -5, 0, 20, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, 11, -5, 0, 20, 1)).toBe(false);
    expect(segmentReachesBox(box, 0, -5, 5, 20, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, -5, 11, 20, 0, 1)).toBe(false);
  });

  it('treats a zero-length segment as its start point', () => {
    expect(segmentReachesBox(box, 0, 5, 5, 0, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, 10, 10, 0, 0, 1)).toBe(true);
    expect(segmentReachesBox(box, 0, 11, 5, 0, 0, 1)).toBe(false);
  });

  it('only tests the segment up to maxFraction', () => {
    // The segment from x = -20 reaches the box at t = 0.5.
    expect(segmentReachesBox(box, 0, -20, 5, 40, 0, 0.6)).toBe(true);
    expect(segmentReachesBox(box, 0, -20, 5, 40, 0, 0.5)).toBe(true);
    expect(segmentReachesBox(box, 0, -20, 5, 40, 0, 0.4)).toBe(false);
  });

  it('agrees with sampling points along random segments', () => {
    const random = new Random('flat-bounds');
    let disagreements = 0;
    let reachedCount = 0;

    for (let i = 0; i < 500; i++) {
      const startX = random.randomFloat(-10, 20);
      const startY = random.randomFloat(-10, 20);
      const deltaX = random.randomFloat(-30, 30);
      const deltaY = random.randomFloat(-30, 30);
      const maxFraction = random.randomFloat(0, 1);
      const reaches = segmentReachesBox(
        box,
        0,
        startX,
        startY,
        deltaX,
        deltaY,
        maxFraction,
      );
      const sampled = sampledSegmentReachesBox(
        box,
        startX,
        startY,
        deltaX,
        deltaY,
        maxFraction,
      );

      // Sampling never finds a point the slab test rejects.
      if (sampled) {
        expect(reaches).toBe(true);
      }

      // It can miss a segment that only clips a corner between samples.
      if (reaches !== sampled) {
        disagreements++;
      }

      if (reaches) {
        reachedCount++;
      }
    }

    expect(reachedCount).toBeGreaterThan(50);
    expect(reachedCount).toBeLessThan(450);
    expect(disagreements).toBeLessThanOrEqual(2);
  });
});
