import { describe, expect, it } from 'vitest';
import { Rect, Rects } from './rect.js';

describe('Rects', () => {
  describe('zero', () => {
    it('returns a zero-size rect at the origin', () => {
      expect(Rects.zero).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 0, y: 0 },
      });
    });

    it('returns a fresh instance on every access', () => {
      expect(Rects.zero).not.toBe(Rects.zero);
    });
  });

  describe('size', () => {
    it('returns the difference between max and min', () => {
      const rect: Rect = { min: { x: 2, y: 3 }, max: { x: 12, y: 23 } };

      expect(Rects.size(rect)).toEqual({ x: 10, y: 20 });
    });
  });

  describe('contains', () => {
    it('contains a point strictly inside', () => {
      const rect: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 20 } };

      expect(Rects.contains(rect, { x: 5, y: 5 })).toBe(true);
    });

    it('contains points on its edges and corners (inclusive)', () => {
      const rect: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 20 } };

      // corners
      expect(Rects.contains(rect, { x: 0, y: 0 })).toBe(true);
      expect(Rects.contains(rect, { x: 10, y: 0 })).toBe(true);
      expect(Rects.contains(rect, { x: 0, y: 20 })).toBe(true);
      expect(Rects.contains(rect, { x: 10, y: 20 })).toBe(true);

      // edges
      expect(Rects.contains(rect, { x: 5, y: 0 })).toBe(true);
      expect(Rects.contains(rect, { x: 10, y: 10 })).toBe(true);
      expect(Rects.contains(rect, { x: 5, y: 20 })).toBe(true);
      expect(Rects.contains(rect, { x: 0, y: 10 })).toBe(true);
    });

    it('does not contain points outside its bounds', () => {
      const rect: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 20 } };

      expect(Rects.contains(rect, { x: -1, y: 5 })).toBe(false);
      expect(Rects.contains(rect, { x: 11, y: 5 })).toBe(false);
      expect(Rects.contains(rect, { x: 5, y: -1 })).toBe(false);
      expect(Rects.contains(rect, { x: 5, y: 21 })).toBe(false);
    });

    it('handles zero size: only the min point is contained', () => {
      const rect: Rect = { min: { x: 3, y: 4 }, max: { x: 3, y: 4 } };

      expect(Rects.contains(rect, { x: 3, y: 4 })).toBe(true);
      expect(Rects.contains(rect, { x: 3, y: 5 })).toBe(false);
      expect(Rects.contains(rect, { x: 4, y: 4 })).toBe(false);
    });
  });

  describe('intersects', () => {
    it('returns true for overlapping rectangles', () => {
      const rectA: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };
      const rectB: Rect = { min: { x: 5, y: 5 }, max: { x: 15, y: 15 } };

      expect(Rects.intersects(rectA, rectB)).toBe(true);
      expect(Rects.intersects(rectB, rectA)).toBe(true);
    });

    it('returns true for rectangles touching at an edge', () => {
      const rectA: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };
      const rectB: Rect = { min: { x: 10, y: 0 }, max: { x: 20, y: 10 } };

      expect(Rects.intersects(rectA, rectB)).toBe(true);
      expect(Rects.intersects(rectB, rectA)).toBe(true);
    });

    it('returns true for rectangles touching at a corner', () => {
      const rectA: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };
      const rectB: Rect = { min: { x: 10, y: 10 }, max: { x: 20, y: 20 } };

      expect(Rects.intersects(rectA, rectB)).toBe(true);
    });

    it('returns false for non-overlapping rectangles', () => {
      const rectA: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };
      const rectB: Rect = { min: { x: 20, y: 20 }, max: { x: 30, y: 30 } };

      expect(Rects.intersects(rectA, rectB)).toBe(false);
      expect(Rects.intersects(rectB, rectA)).toBe(false);
    });

    it('returns true when one rectangle is fully inside another', () => {
      const rectA: Rect = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };
      const rectB: Rect = { min: { x: 2, y: 2 }, max: { x: 4, y: 4 } };

      expect(Rects.intersects(rectA, rectB)).toBe(true);
      expect(Rects.intersects(rectB, rectA)).toBe(true);
    });
  });

  describe('clone', () => {
    it('returns a deep, equal copy', () => {
      const rect: Rect = { min: { x: 1, y: 2 }, max: { x: 3, y: 4 } };
      const clone = Rects.clone(rect);

      expect(clone).toEqual(rect);
      expect(clone).not.toBe(rect);
      expect(clone.min).not.toBe(rect.min);
      expect(clone.max).not.toBe(rect.max);
    });
  });
});
