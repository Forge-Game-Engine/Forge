import { describe, expect, it } from 'vitest';
import { calculatePixelsPerUnit } from './calculate-pixels-per-unit';

describe('calculatePixelsPerUnit', () => {
  it('should compute pixels-per-unit from canvas height and vertical world units', () => {
    expect(calculatePixelsPerUnit(1080, 10)).toBe(108);
  });

  it('should double when canvas height doubles', () => {
    const verticalWorldUnits = 10;

    const base = calculatePixelsPerUnit(1080, verticalWorldUnits);
    const doubled = calculatePixelsPerUnit(2160, verticalWorldUnits);

    expect(doubled).toBe(base * 2);
  });

  it('should halve when vertical world units double', () => {
    const canvasHeight = 1080;

    const base = calculatePixelsPerUnit(canvasHeight, 10);
    const doubled = calculatePixelsPerUnit(canvasHeight, 20);

    expect(doubled).toBe(base / 2);
  });

  it('should throw when canvasHeight is not positive', () => {
    expect(() => calculatePixelsPerUnit(0, 10)).toThrow();
    expect(() => calculatePixelsPerUnit(-100, 10)).toThrow();
  });

  it('should throw when verticalWorldUnits is not positive', () => {
    expect(() => calculatePixelsPerUnit(1080, 0)).toThrow();
    expect(() => calculatePixelsPerUnit(1080, -10)).toThrow();
  });
});
