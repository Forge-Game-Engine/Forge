import { describe, expect, it } from 'vitest';
import { calculateVisibleWorldSize } from './calculate-visible-world-size';
import { Vec2 } from '../../math';

describe('calculateVisibleWorldSize', () => {
  it('should return verticalWorldUnits as the height, and scale width by aspect ratio', () => {
    const result = calculateVisibleWorldSize(1600, 900, 10);

    expect(result).toEqual(Vec2.create((10 * 1600) / 900, 10));
  });

  it('should return a square size for a square destination', () => {
    const result = calculateVisibleWorldSize(500, 500, 20);

    expect(result).toEqual(Vec2.create(20, 20));
  });

  it('should keep height constant while width tracks aspect ratio changes', () => {
    const verticalWorldUnits = 600;

    const wide = calculateVisibleWorldSize(1600, 600, verticalWorldUnits);
    const narrow = calculateVisibleWorldSize(800, 600, verticalWorldUnits);

    expect(wide.y).toBe(verticalWorldUnits);
    expect(narrow.y).toBe(verticalWorldUnits);
    expect(wide.x).toBeGreaterThan(narrow.x);
  });

  it('should throw when canvasWidth is not positive', () => {
    expect(() => calculateVisibleWorldSize(0, 600, 10)).toThrow();
    expect(() => calculateVisibleWorldSize(-100, 600, 10)).toThrow();
  });

  it('should throw when canvasHeight is not positive', () => {
    expect(() => calculateVisibleWorldSize(800, 0, 10)).toThrow();
    expect(() => calculateVisibleWorldSize(800, -600, 10)).toThrow();
  });

  it('should throw when verticalWorldUnits is not positive', () => {
    expect(() => calculateVisibleWorldSize(800, 600, 0)).toThrow();
    expect(() => calculateVisibleWorldSize(800, 600, -10)).toThrow();
  });
});
