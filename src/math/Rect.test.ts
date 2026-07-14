import { describe, expect, it } from 'vitest';
import { Rect } from './Rect';
import { Vector2 } from './vector2';

describe('Rect', () => {
  it('constructs with given origin and size', () => {
    const origin = new Vector2(0, 0);
    const size = new Vector2(10, 20);
    const rect = new Rect(origin, size);

    expect(rect.origin).toEqual({ x: 0, y: 0 });
    expect(rect.size).toEqual({ x: 10, y: 20 });
  });

  it('contains a point strictly inside', () => {
    const rect = new Rect(new Vector2(0, 0), new Vector2(10, 20));
    expect(rect.containsPoint(new Vector2(5, 5))).toBe(true);
  });

  it('contains points on its edges and corners (inclusive)', () => {
    const rect = new Rect(new Vector2(0, 0), new Vector2(10, 20));

    // corners
    expect(rect.containsPoint(new Vector2(0, 0))).toBe(true);
    expect(rect.containsPoint(new Vector2(10, 0))).toBe(true);
    expect(rect.containsPoint(new Vector2(0, 20))).toBe(true);
    expect(rect.containsPoint(new Vector2(10, 20))).toBe(true);

    // edges
    expect(rect.containsPoint(new Vector2(5, 0))).toBe(true);
    expect(rect.containsPoint(new Vector2(10, 10))).toBe(true);
    expect(rect.containsPoint(new Vector2(5, 20))).toBe(true);
    expect(rect.containsPoint(new Vector2(0, 10))).toBe(true);
  });

  it('does not contain points outside its bounds', () => {
    const rect = new Rect(new Vector2(0, 0), new Vector2(10, 20));

    expect(rect.containsPoint(new Vector2(-1, 5))).toBe(false);
    expect(rect.containsPoint(new Vector2(11, 5))).toBe(false);
    expect(rect.containsPoint(new Vector2(5, -1))).toBe(false);
    expect(rect.containsPoint(new Vector2(5, 21))).toBe(false);
  });

  it('handles zero size: only the origin point is contained', () => {
    const rect = new Rect(new Vector2(3, 4), new Vector2(0, 0));
    expect(rect.containsPoint(new Vector2(3, 4))).toBe(true);
    expect(rect.containsPoint(new Vector2(3, 5))).toBe(false);
    expect(rect.containsPoint(new Vector2(4, 4))).toBe(false);
  });

  describe('intersects', () => {
    it('returns true for overlapping rectangles', () => {
      const a = new Rect(new Vector2(0, 0), new Vector2(10, 10));
      const b = new Rect(new Vector2(5, 5), new Vector2(10, 10));
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });

    it('returns true for rectangles touching at an edge', () => {
      const a = new Rect(new Vector2(0, 0), new Vector2(10, 10));
      const b = new Rect(new Vector2(10, 0), new Vector2(10, 10));
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });

    it('returns true for rectangles touching at a corner', () => {
      const a = new Rect(new Vector2(0, 0), new Vector2(10, 10));
      const b = new Rect(new Vector2(10, 10), new Vector2(10, 10));
      expect(a.intersects(b)).toBe(true);
    });

    it('returns false for non-overlapping rectangles', () => {
      const a = new Rect(new Vector2(0, 0), new Vector2(10, 10));
      const b = new Rect(new Vector2(20, 20), new Vector2(10, 10));
      expect(a.intersects(b)).toBe(false);
      expect(b.intersects(a)).toBe(false);
    });

    it('returns true when one rectangle is fully inside another', () => {
      const a = new Rect(new Vector2(0, 0), new Vector2(10, 10));
      const b = new Rect(new Vector2(2, 2), new Vector2(2, 2));
      expect(a.intersects(b)).toBe(true);
      expect(b.intersects(a)).toBe(true);
    });
  });
});
