import { describe, expect, it } from 'vitest';
import { lerpAngle } from './lerp-angle.js';

const fullTurn = Math.PI * 2;

const sameDirection = (a: number, b: number): number => {
  const difference = (((a - b) % fullTurn) + fullTurn) % fullTurn;

  return Math.min(difference, fullTurn - difference);
};

describe('lerpAngle', () => {
  it('returns from when t is 0', () => {
    expect(lerpAngle(1, 2, 0)).toBe(1);
    expect(lerpAngle(3, -3, 0)).toBe(3);
  });

  it('returns an angle pointing the same way as to when t is 1', () => {
    expect(lerpAngle(1, 2, 1)).toBeCloseTo(2);
    expect(sameDirection(lerpAngle(3, -3, 1), -3)).toBeCloseTo(0);
  });

  it('interpolates linearly between close angles', () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(lerpAngle(1, 0, 0.25)).toBeCloseTo(0.75);
  });

  it('passes through π, not 0, going from 3 to -3', () => {
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI);
  });

  it('passes through -π, not 0, going from -3 to 3', () => {
    expect(lerpAngle(-3, 3, 0.5)).toBeCloseTo(-Math.PI);
  });

  it('stays near from when from has wound past a whole turn', () => {
    const result = lerpAngle(7, 0.8, 0.5);

    expect(result).toBeCloseTo(7 + (0.8 + fullTurn - 7) / 2);
    expect(result).toBeGreaterThan(fullTurn);
  });
});
