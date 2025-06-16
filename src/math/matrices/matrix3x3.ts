/**
 * Represents a 3x3 transformation matrix used for 2D graphics operations.
 * The matrix is stored in column-major order as a flat array of 9 numbers.
 *
 * Matrix layout:
 * [0 3 6]
 * [1 4 7]
 * [2 5 8]
 */
export class Matrix3x3 {
  /** The underlying matrix data stored as a flat array in column-major order */
  private _matrix: number[];

  /**
   * Creates a new 3x3 matrix from the given array.
   * @param matrix - An array of 9 numbers representing the matrix in column-major order
   */
  constructor(matrix: number[]) {
    if (matrix.length !== 9) {
      throw new Error('Matrix3x3 requires exactly 9 elements');
    }

    this._matrix = matrix;
  }

  /**
   * Gets the underlying matrix array.
   * @returns The matrix data as a flat array in column-major order
   */
  get matrix(): number[] {
    return this._matrix;
  }

  /**
   * Applies a translation transformation to the matrix.
   * @param x - The x-coordinate translation
   * @param y - The y-coordinate translation
   * @returns This matrix for chaining
   */
  public translate(x: number, y: number): Matrix3x3 {
    this._matrix[6] += this._matrix[0] * x + this._matrix[3] * y;
    this._matrix[7] += this._matrix[1] * x + this._matrix[4] * y;

    return this;
  }

  /**
   * Applies a rotation transformation to the matrix.
   * @param radians - The rotation angle in radians
   * @returns This matrix for chaining
   */
  public rotate(radians: number): Matrix3x3 {
    const cosRotation = Math.cos(radians);
    const sinRotation = Math.sin(radians);
    const m0 = this._matrix[0];
    const m1 = this._matrix[1];
    const m3 = this._matrix[3];
    const m4 = this._matrix[4];

    this._matrix[0] = cosRotation * m0 + sinRotation * m3;
    this._matrix[1] = cosRotation * m1 + sinRotation * m4;
    this._matrix[3] = -sinRotation * m0 + cosRotation * m3;
    this._matrix[4] = -sinRotation * m1 + cosRotation * m4;

    return this;
  }

  /**
   * Applies a scale transformation to the matrix.
   * @param x - The x-axis scale factor
   * @param y - The y-axis scale factor
   * @returns This matrix for chaining
   */
  public scale(x: number, y: number): Matrix3x3 {
    this._matrix[0] *= x;
    this._matrix[1] *= x;
    this._matrix[3] *= y;
    this._matrix[4] *= y;

    return this;
  }

  get data(): number[] {
    return this._matrix;
  }
}
