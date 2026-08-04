import { describe, expect, it } from 'vitest';
import { Rect } from './Rect';

describe('Rect', () => {
  it('constructs with given origin and size', () => {
    const origin = { x: 0, y: 0 };
    const size = { x: 10, y: 20 };
    const rect = new Rect(origin, size);

    expect(rect.origin).toEqual({ x: 0, y: 0 });
    expect(rect.size).toEqual({ x: 10, y: 20 });
  });

  it('contains a point strictly inside', () => {
    const rect = new Rect({ x: 0, y: 0 }, { x: 10, y: 20 });
    expect(rect.containsPoint({ x: 5, y: 5 })).toBe(true);
  });

  it('contains points on its edges and corners (inclusive)', () => {
    const rect = new Rect({ x: 0, y: 0 }, { x: 10, y: 20 });

    // corners
    expect(rect.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(rect.containsPoint({ x: 10, y: 0 })).toBe(true);
    expect(rect.containsPoint({ x: 0, y: 20 })).toBe(true);
    expect(rect.containsPoint({ x: 10, y: 20 })).toBe(true);

    // edges
    expect(rect.containsPoint({ x: 5, y: 0 })).toBe(true);
    expect(rect.containsPoint({ x: 10, y: 10 })).toBe(true);
    expect(rect.containsPoint({ x: 5, y: 20 })).toBe(true);
    expect(rect.containsPoint({ x: 0, y: 10 })).toBe(true);
  });

  it('does not contain points outside its bounds', () => {
    const rect = new Rect({ x: 0, y: 0 }, { x: 10, y: 20 });

    expect(rect.containsPoint({ x: -1, y: 5 })).toBe(false);
    expect(rect.containsPoint({ x: 11, y: 5 })).toBe(false);
    expect(rect.containsPoint({ x: 5, y: -1 })).toBe(false);
    expect(rect.containsPoint({ x: 5, y: 21 })).toBe(false);
  });

  it('handles zero size: only the origin point is contained', () => {
    const rect = new Rect({ x: 3, y: 4 }, { x: 0, y: 0 });
    expect(rect.containsPoint({ x: 3, y: 4 })).toBe(true);
    expect(rect.containsPoint({ x: 3, y: 5 })).toBe(false);
    expect(rect.containsPoint({ x: 4, y: 4 })).toBe(false);
  });

  describe('intersects', () => {
    it('returns true for overlapping rectangles', () => {
      const a = new Rect({ x: 0, y: 0 }, { x: 10, y: 10 });
      const b = new Rect({ x: 5, y: 5 }, { x: 10, y: 10 });
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });

    it('returns true for rectangles touching at an edge', () => {
      const a = new Rect({ x: 0, y: 0 }, { x: 10, y: 10 });
      const b = new Rect({ x: 10, y: 0 }, { x: 10, y: 10 });
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });

    it('returns true for rectangles touching at a corner', () => {
      const a = new Rect({ x: 0, y: 0 }, { x: 10, y: 10 });
      const b = new Rect({ x: 10, y: 10 }, { x: 10, y: 10 });
      expect(a.intersects(b)).toBe(true);
    });

    it('returns false for non-overlapping rectangles', () => {
      const a = new Rect({ x: 0, y: 0 }, { x: 10, y: 10 });
      const b = new Rect({ x: 20, y: 20 }, { x: 10, y: 10 });
      expect(a.intersects(b)).toBe(false);
      expect(b.intersects(a)).toBe(false);
    });

    it('returns true when one rectangle is fully inside another', () => {
      const a = new Rect({ x: 0, y: 0 }, { x: 10, y: 10 });
      const b = new Rect({ x: 2, y: 2 }, { x: 2, y: 2 });
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });
  });
});
