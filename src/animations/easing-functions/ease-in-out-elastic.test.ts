import { describe, expect, it } from 'vitest';
import { easeInOutElastic } from './ease-in-out-elastic';

describe('easeInOutElastic', () => {
  it('should return 0 when t is 0', () => {
    expect(easeInOutElastic(0)).toBe(0);
  });

  it('should return 1 when t is 1', () => {
    expect(easeInOutElastic(1)).toBe(1);
  });

  it('should be continuous across the t = 0.5 midpoint', () => {
    const justBelow = easeInOutElastic(0.499);
    const justAbove = easeInOutElastic(0.501);

    expect(Math.abs(justAbove - justBelow)).toBeLessThan(0.05);
  });

  it('should approach 1 as t approaches 1', () => {
    expect(easeInOutElastic(0.99)).toBeGreaterThan(0.9);
  });
});
