import { Vector2 } from './vector2';
import { scaleRelativeToPoint } from './scale-relative-to-point';
import { describe, expect, it } from 'vitest';

describe('scaleRelativeToPoint', () => {
  it('should scale a point relative to a pivot point by a given scale factor', () => {
    const point = new Vector2(2, 3);
    const pivot = new Vector2(1, 1);
    const scale = new Vector2(2, 2);
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(result.equals(new Vector2(3, 5))).toBe(true);
  });

  it('should handle scaling with a scale factor of 1 (no scaling)', () => {
    const point = new Vector2(2, 3);
    const pivot = new Vector2(1, 1);
    const scale = new Vector2(1, 1);
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(result.equals(new Vector2(2, 3))).toBe(true);
  });

  it('should handle scaling with a scale factor of 0 (collapse to pivot)', () => {
    const point = new Vector2(2, 3);
    const pivot = new Vector2(1, 1);
    const scale = new Vector2(0, 0);
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(result.equals(new Vector2(1, 1))).toBe(true);
  });

  it('should handle negative scale factors', () => {
    const point = new Vector2(2, 3);
    const pivot = new Vector2(1, 1);
    const scale = new Vector2(-1, -1);
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(result.equals(new Vector2(0, -1))).toBe(true);
  });

  it('should handle non-uniform scaling', () => {
    const point = new Vector2(2, 3);
    const pivot = new Vector2(1, 1);
    const scale = new Vector2(2, 0.5);
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(result.equals(new Vector2(3, 2))).toBe(true);
  });
});
