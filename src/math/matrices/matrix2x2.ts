import { Vector2 } from '../vector2.js';

/**
 * A 2x2 matrix, primarily used to solve small effective-mass systems in
 * physics constraint solvers (e.g. a 2-DOF point constraint).
 *
 * Matrix layout:
 * [m00 m01]
 * [m10 m11]
 */
export class Matrix2x2 {
  public readonly m00: number;
  public readonly m01: number;
  public readonly m10: number;
  public readonly m11: number;

  constructor(m00: number, m01: number, m10: number, m11: number) {
    this.m00 = m00;
    this.m01 = m01;
    this.m10 = m10;
    this.m11 = m11;
  }

  /**
   * Solves `this * x = b` for `x`, using Cramer's rule.
   * @param b - The right-hand side vector.
   * @returns The solution vector, or `Vector2.zero` if the matrix is singular.
   */
  public solve(b: Vector2): Vector2 {
    const determinant = this.m00 * this.m11 - this.m01 * this.m10;

    if (determinant === 0) {
      return Vector2.zero;
    }

    const inverseDeterminant = 1 / determinant;

    return new Vector2(
      inverseDeterminant * (this.m11 * b.x - this.m01 * b.y),
      inverseDeterminant * (this.m00 * b.y - this.m10 * b.x),
    );
  }
}
