import { describe, expect, it } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('should return the value if it is within the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(1, 1, 10)).toBe(1);
    expect(clamp(10, 1, 10)).toBe(10);
  });

  it('should return the minimum value if the value is less than the minimum', () => {
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(-5, 1, 10)).toBe(1);
  });

  it('should return the maximum value if the value is greater than the maximum', () => {
    expect(clamp(15, 1, 10)).toBe(10);
    expect(clamp(20, 1, 10)).toBe(10);
  });

  it('should handle edge cases where min and max are the same', () => {
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(0, 5, 5)).toBe(5);
    expect(clamp(10, 5, 5)).toBe(5);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});
