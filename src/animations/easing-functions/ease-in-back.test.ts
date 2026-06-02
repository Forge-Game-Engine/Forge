import { describe, expect, it } from 'vitest';
import { easeInBack } from './ease-in-back';

describe('easeInBack', () => {
  it('should return 0 when x is 0', () => {
    expect(easeInBack(0)).toBe(0);
  });

  it('should return 1 when x is 1', () => {
    expect(easeInBack(1)).toBeCloseTo(1);
  });

  it('should return a negative value for small positive x', () => {
    expect(easeInBack(0.1)).toBeLessThan(0);
  });

  it('should return a positive value for x greater than 0.75', () => {
    expect(easeInBack(0.75)).toBeGreaterThan(0);
  });

  it('should return a value close to 0.5 for x around 0.5', () => {
    expect(easeInBack(0.5)).toBeCloseTo(-0.09);
  });
});
