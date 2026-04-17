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
});
