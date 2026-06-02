import { describe, expect, it } from 'vitest';
import { lerp } from './lerp';

describe('lerp', () => {
  it('should return the start value when t is 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(5, 15, 0)).toBe(5);
  });

  it('should return the end value when t is 1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(5, 15, 1)).toBe(15);
  });

  it('should return the correct interpolated value for t between 0 and 1', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(5, 15, 0.5)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('should handle t values less than 0', () => {
    expect(lerp(0, 10, -0.5)).toBe(-5);
    expect(lerp(5, 15, -0.5)).toBe(0);
  });

  it('should handle t values greater than 1', () => {
    expect(lerp(0, 10, 1.5)).toBe(15);
    expect(lerp(5, 15, 1.5)).toBe(20);
  });

  it('should handle negative start and end values', () => {
    expect(lerp(-10, -5, 0.5)).toBe(-7.5);
    expect(lerp(-20, -10, 0.25)).toBe(-17.5);
  });
});
