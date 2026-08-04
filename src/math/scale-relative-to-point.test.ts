import { Vec2 } from './vector2';
import { scaleRelativeToPoint } from './scale-relative-to-point';
import { describe, expect, it } from 'vitest';

describe('scaleRelativeToPoint', () => {
  it('should scale a point relative to a pivot point by a given scale factor', () => {
    const point = { x: 2, y: 3 };
    const pivot = { x: 1, y: 1 };
    const scale = { x: 2, y: 2 };
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(Vec2.equals(result, { x: 3, y: 5 })).toBe(true);
  });

  it('should handle scaling with a scale factor of 1 (no scaling)', () => {
    const point = { x: 2, y: 3 };
    const pivot = { x: 1, y: 1 };
    const scale = { x: 1, y: 1 };
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(Vec2.equals(result, { x: 2, y: 3 })).toBe(true);
  });

  it('should handle scaling with a scale factor of 0 (collapse to pivot)', () => {
    const point = { x: 2, y: 3 };
    const pivot = { x: 1, y: 1 };
    const scale = { x: 0, y: 0 };
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(Vec2.equals(result, { x: 1, y: 1 })).toBe(true);
  });

  it('should handle negative scale factors', () => {
    const point = { x: 2, y: 3 };
    const pivot = { x: 1, y: 1 };
    const scale = { x: -1, y: -1 };
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(Vec2.equals(result, { x: 0, y: -1 })).toBe(true);
  });

  it('should handle non-uniform scaling', () => {
    const point = { x: 2, y: 3 };
    const pivot = { x: 1, y: 1 };
    const scale = { x: 2, y: 0.5 };
    const result = scaleRelativeToPoint(point, pivot, scale);

    expect(Vec2.equals(result, { x: 3, y: 2 })).toBe(true);
  });
});
