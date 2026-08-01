import { describe, expect, it } from 'vitest';
import { Matrix2x2 } from './matrix2x2.js';
import { Vector2 } from '../vector2.js';

describe('Matrix2x2', () => {
  it('should solve for x given the identity matrix', () => {
    const matrix = new Matrix2x2(1, 0, 0, 1);

    const result = matrix.solve(new Vector2(3, 4));

    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(4);
  });

  it('should solve a coupled 2x2 system', () => {
    const matrix = new Matrix2x2(2, 1, 1, 3);

    const result = matrix.solve(new Vector2(5, 10));

    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(3);
  });

  it('should return zero for a singular matrix', () => {
    const matrix = new Matrix2x2(1, 2, 2, 4);

    const result = matrix.solve(new Vector2(3, 4));

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});
