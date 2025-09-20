import { describe, expect, it } from 'vitest';
import { signedSquare } from './signed-square';

describe('signedSquare', () => {
  it('returns the square for positive numbers', () => {
    expect(signedSquare(3)).toBe(9);
    expect(signedSquare(1)).toBe(1);
    expect(signedSquare(0.5)).toBeCloseTo(0.25);
  });

  it('returns the negative square for negative numbers', () => {
    expect(signedSquare(-3)).toBe(-9);
    expect(signedSquare(-1)).toBe(-1);
    expect(signedSquare(-0.5)).toBeCloseTo(-0.25);
  });

  it('returns 0 for input 0', () => {
    expect(signedSquare(0)).toBe(0);
  });

  it('returns -0 for input -0', () => {
    expect(signedSquare(-0)).toBe(-0);
  });

  it('handles large numbers', () => {
    expect(signedSquare(1e6)).toBe(1e12);
    expect(signedSquare(-1e6)).toBe(-1e12);
  });

  it('handles NaN and Infinity', () => {
    expect(signedSquare(NaN)).toBeNaN();
    expect(signedSquare(Infinity)).toBe(Infinity);
    expect(signedSquare(-Infinity)).toBe(-Infinity);
  });
});
