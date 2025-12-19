import { describe, expect, it } from 'vitest';
import { Matrix3x3 } from './matrix3x3';

describe('Matrix3x3', () => {
  it('should initialize with the given matrix', () => {
    const matrix = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(matrix.matrix).toEqual(
      new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
  });

  it('should translate the matrix', () => {
    const matrix = new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    matrix.translate(2, 3);
    expect(matrix.matrix).toEqual(
      new Float32Array([1, 0, 0, 0, 1, 0, 2, 3, 1]),
    );
  });

  it('should rotate the matrix', () => {
    const matrix = new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    matrix.rotate(Math.PI / 2);
    expect(matrix.matrix[0]).toBeCloseTo(0);
    expect(matrix.matrix[1]).toBeCloseTo(1);
    expect(matrix.matrix[3]).toBeCloseTo(-1);
    expect(matrix.matrix[4]).toBeCloseTo(0);
  });

  it('should scale the matrix', () => {
    const matrix = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    matrix.scale(2, 3);
    expect(matrix.matrix).toEqual(
      new Float32Array([2, 4, 3, 12, 15, 6, 7, 8, 9]),
    );
  });
});
