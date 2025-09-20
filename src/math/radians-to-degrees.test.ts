import { describe, expect, it } from 'vitest';
import { radiansToDegrees } from './radians-to-degrees';

describe('radiansToDegrees', () => {
  it('converts 0 radians to 0 degrees', () => {
    expect(radiansToDegrees(0)).toBe(0);
  });

  it('converts PI radians to 180 degrees', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
  });

  it('converts PI/2 radians to 90 degrees', () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
  });

  it('converts PI/4 radians to 45 degrees', () => {
    expect(radiansToDegrees(Math.PI / 4)).toBeCloseTo(45);
  });

  it('converts 2*PI radians to 360 degrees', () => {
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
  });

  it('converts negative radians', () => {
    expect(radiansToDegrees(-Math.PI)).toBeCloseTo(-180);
  });

  it('handles non-integer radians', () => {
    expect(radiansToDegrees(1)).toBeCloseTo(57.2958, 4);
  });
});
