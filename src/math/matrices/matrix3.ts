import type { Brand } from '../../utilities/types/brand.js';
import type { Quaternion } from '../quaternion.js';
import type { Vector3 } from '../vector3.js';
import type { Matrix4 } from './matrix4.js';

/**
 * A 3x3 matrix: 9 numbers in column-major order, acting on column vectors.
 * Element `m[c * 3 + r]` is row `r`, column `c`. Used for rotations,
 * normal matrices and inertia tensors.
 *
 * It's a plain `number[]` (64-bit, created from an array literal so the
 * engine stores it as packed doubles), branded so a {@link Matrix4} can't be
 * passed where a `Matrix3` is expected. Create one with {@link Mat3.create}.
 */
export type Matrix3 = Brand<number[], 'Matrix3'>;

/**
 * Static operations on {@link Matrix3}. Every operation that writes a
 * matrix writes into its first argument (`target` or `out`) and returns it,
 * so no operation allocates except {@link Mat3.create} and
 * {@link Mat3.clone}. `target` and `out` may be the same matrix as any
 * other argument.
 */
export class Mat3 {
  /**
   * Creates a new identity matrix.
   * @returns A new `Matrix3`.
   */
  public static create(): Matrix3 {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  /**
   * Sets a matrix to the identity.
   * @param out - The matrix to write.
   * @returns `out`, for chaining.
   */
  public static identity(out: Matrix3): Matrix3 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;

    return out;
  }

  /**
   * Copies a matrix's elements into another.
   * @param out - The matrix to write.
   * @param matrix - The matrix to copy.
   * @returns `out`, for chaining.
   */
  public static copy(out: Matrix3, matrix: Matrix3): Matrix3 {
    for (let i = 0; i < 9; i++) {
      out[i] = matrix[i];
    }

    return out;
  }

  /**
   * Creates a copy of a matrix.
   * @param matrix - The matrix to copy.
   * @returns A new `Matrix3` with the same elements.
   */
  public static clone(matrix: Matrix3): Matrix3 {
    return Mat3.copy(Mat3.create(), matrix);
  }

  /**
   * Sets `target` to `target * value`: the transform that applies `value`
   * first, then `target`.
   * @param target - The matrix to write, the left operand.
   * @param value - The right operand.
   * @returns `target`, for chaining.
   */
  public static multiply(target: Matrix3, value: Matrix3): Matrix3 {
    return Mat3._multiply(target, target, value);
  }

  /**
   * Sets `target` to `value * target`: the transform that applies `target`
   * first, then `value`.
   * @param target - The matrix to write, the right operand.
   * @param value - The left operand.
   * @returns `target`, for chaining.
   */
  public static premultiply(target: Matrix3, value: Matrix3): Matrix3 {
    return Mat3._multiply(target, value, target);
  }

  /**
   * Transposes a matrix in place, swapping its rows and columns. The
   * transpose of a rotation is its inverse.
   * @param target - The matrix to transpose.
   * @returns `target`, for chaining.
   */
  public static transpose(target: Matrix3): Matrix3 {
    const a01 = target[1];
    const a02 = target[2];
    const a12 = target[5];

    target[1] = target[3];
    target[2] = target[6];
    target[3] = a01;
    target[5] = target[7];
    target[6] = a02;
    target[7] = a12;

    return target;
  }

  /**
   * Calculates a matrix's determinant.
   * @param matrix - The matrix.
   * @returns The determinant.
   */
  public static determinant(matrix: Matrix3): number {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[3];
    const a11 = matrix[4];
    const a12 = matrix[5];
    const a20 = matrix[6];
    const a21 = matrix[7];
    const a22 = matrix[8];

    return (
      a00 * (a22 * a11 - a12 * a21) +
      a01 * (-a22 * a10 + a12 * a20) +
      a02 * (a21 * a10 - a11 * a20)
    );
  }

  /**
   * Sets `out` to the inverse of a matrix.
   * @param out - The matrix to write.
   * @param matrix - The matrix to invert.
   * @returns `out`, or `null` if `matrix` is singular, in which case `out`
   * isn't changed.
   */
  public static invert(out: Matrix3, matrix: Matrix3): Matrix3 | null {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[3];
    const a11 = matrix[4];
    const a12 = matrix[5];
    const a20 = matrix[6];
    const a21 = matrix[7];
    const a22 = matrix[8];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    const determinant = a00 * b01 + a01 * b11 + a02 * b21;

    if (determinant === 0) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;

    out[0] = b01 * inverseDeterminant;
    out[1] = (-a22 * a01 + a02 * a21) * inverseDeterminant;
    out[2] = (a12 * a01 - a02 * a11) * inverseDeterminant;
    out[3] = b11 * inverseDeterminant;
    out[4] = (a22 * a00 - a02 * a20) * inverseDeterminant;
    out[5] = (-a12 * a00 + a02 * a10) * inverseDeterminant;
    out[6] = b21 * inverseDeterminant;
    out[7] = (-a21 * a00 + a01 * a20) * inverseDeterminant;
    out[8] = (a11 * a00 - a01 * a10) * inverseDeterminant;

    return out;
  }

  /**
   * Sets `out` to the inverse of a symmetric matrix, such as an inertia
   * tensor. Cheaper than {@link Mat3.invert}: it reads only the lower
   * triangle, and the result is symmetric.
   * @param out - The matrix to write.
   * @param matrix - The symmetric matrix to invert.
   * @returns `out`, or `null` if `matrix` is singular, in which case `out`
   * isn't changed.
   */
  public static invertSymmetric(out: Matrix3, matrix: Matrix3): Matrix3 | null {
    const a = matrix[0];
    const b = matrix[1];
    const c = matrix[2];
    const d = matrix[4];
    const e = matrix[5];
    const f = matrix[8];
    const cofactorA = d * f - e * e;
    const cofactorB = c * e - b * f;
    const cofactorC = b * e - c * d;
    const determinant = a * cofactorA + b * cofactorB + c * cofactorC;

    if (determinant === 0) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;
    const cofactorD = (a * f - c * c) * inverseDeterminant;
    const cofactorE = (b * c - a * e) * inverseDeterminant;
    const cofactorF = (a * d - b * b) * inverseDeterminant;
    const inverseB = cofactorB * inverseDeterminant;
    const inverseC = cofactorC * inverseDeterminant;

    out[0] = cofactorA * inverseDeterminant;
    out[1] = inverseB;
    out[2] = inverseC;
    out[3] = inverseB;
    out[4] = cofactorD;
    out[5] = cofactorE;
    out[6] = inverseC;
    out[7] = cofactorE;
    out[8] = cofactorF;

    return out;
  }

  /**
   * Sets `out` to a rotation matrix.
   * @param out - The matrix to write.
   * @param rotation - The rotation, a unit quaternion.
   * @returns `out`, for chaining.
   */
  public static fromQuat(out: Matrix3, rotation: Quaternion): Matrix3 {
    const { x, y, z, w } = rotation;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = xy - wz;
    out[4] = 1 - (xx + zz);
    out[5] = yz + wx;
    out[6] = xz + wy;
    out[7] = yz - wx;
    out[8] = 1 - (xx + yy);

    return out;
  }

  /**
   * Sets `out` to the upper-left 3x3 of a 4x4 matrix: its rotation and
   * scale, without translation.
   * @param out - The matrix to write.
   * @param matrix - The 4x4 matrix.
   * @returns `out`, for chaining.
   */
  public static fromMatrix4(out: Matrix3, matrix: Matrix4): Matrix3 {
    out[0] = matrix[0];
    out[1] = matrix[1];
    out[2] = matrix[2];
    out[3] = matrix[4];
    out[4] = matrix[5];
    out[5] = matrix[6];
    out[6] = matrix[8];
    out[7] = matrix[9];
    out[8] = matrix[10];

    return out;
  }

  /**
   * Sets `out` to the normal matrix of a 4x4 matrix: the inverse transpose
   * of its upper-left 3x3, which transforms surface normals so they stay
   * perpendicular to surfaces under non-uniform scale. Normals it
   * transforms need normalizing.
   * @param out - The matrix to write.
   * @param matrix - The 4x4 matrix, usually a world matrix.
   * @returns `out`, or `null` if the upper-left 3x3 is singular (a zero
   * scale), in which case `out` isn't changed.
   */
  public static normalFromMatrix4(
    out: Matrix3,
    matrix: Matrix4,
  ): Matrix3 | null {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    const determinant = a00 * b01 + a01 * b11 + a02 * b21;

    if (determinant === 0) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;

    // The transpose of the inverse that Mat3.invert computes.
    out[0] = b01 * inverseDeterminant;
    out[1] = b11 * inverseDeterminant;
    out[2] = b21 * inverseDeterminant;
    out[3] = (-a22 * a01 + a02 * a21) * inverseDeterminant;
    out[4] = (a22 * a00 - a02 * a20) * inverseDeterminant;
    out[5] = (-a21 * a00 + a01 * a20) * inverseDeterminant;
    out[6] = (a12 * a01 - a02 * a11) * inverseDeterminant;
    out[7] = (-a12 * a00 + a02 * a10) * inverseDeterminant;
    out[8] = (a11 * a00 - a01 * a10) * inverseDeterminant;

    return out;
  }

  /**
   * Sets `out` to a scale matrix.
   * @param out - The matrix to write.
   * @param scale - The scale along each axis.
   * @returns `out`, for chaining.
   */
  public static fromScale(out: Matrix3, scale: Vector3): Matrix3 {
    Mat3.identity(out);
    out[0] = scale.x;
    out[4] = scale.y;
    out[8] = scale.z;

    return out;
  }

  /**
   * Sets `out` to the cross-product matrix of a vector, the matrix `[v]×`
   * with `[v]× * w = v × w`.
   * @param out - The matrix to write.
   * @param vector - The vector.
   * @returns `out`, for chaining.
   */
  public static skew(out: Matrix3, vector: Vector3): Matrix3 {
    const { x, y, z } = vector;

    out[0] = 0;
    out[1] = z;
    out[2] = -y;
    out[3] = -z;
    out[4] = 0;
    out[5] = x;
    out[6] = y;
    out[7] = -x;
    out[8] = 0;

    return out;
  }

  /**
   * Sets `out` to the outer product `a * bᵀ` of two vectors: element row
   * `r`, column `c` is `a[r] * b[c]`.
   * @param out - The matrix to write.
   * @param a - The column vector.
   * @param b - The row vector.
   * @returns `out`, for chaining.
   */
  public static outerProduct(out: Matrix3, a: Vector3, b: Vector3): Matrix3 {
    out[0] = a.x * b.x;
    out[1] = a.y * b.x;
    out[2] = a.z * b.x;
    out[3] = a.x * b.y;
    out[4] = a.y * b.y;
    out[5] = a.z * b.y;
    out[6] = a.x * b.z;
    out[7] = a.y * b.z;
    out[8] = a.z * b.z;

    return out;
  }

  /**
   * Adds another matrix into `target`, element by element.
   * @param target - The matrix to mutate.
   * @param value - The matrix to add.
   * @returns `target`, for chaining.
   */
  public static add(target: Matrix3, value: Matrix3): Matrix3 {
    for (let i = 0; i < 9; i++) {
      target[i] += value[i];
    }

    return target;
  }

  /**
   * Multiplies every element of `target` by a scalar.
   * @param target - The matrix to mutate.
   * @param scalar - The scalar to multiply by.
   * @returns `target`, for chaining.
   */
  public static scale(target: Matrix3, scalar: number): Matrix3 {
    for (let i = 0; i < 9; i++) {
      target[i] *= scalar;
    }

    return target;
  }

  /**
   * Writes a matrix's 9 elements into a `Float32Array`, rounding each to 32
   * bits.
   * @param out - The array to write.
   * @param offset - The index of the first element to write.
   * @param matrix - The matrix.
   * @returns `out`, for chaining.
   */
  public static toFloat32(
    out: Float32Array,
    offset: number,
    matrix: Matrix3,
  ): Float32Array {
    for (let i = 0; i < 9; i++) {
      out[offset + i] = matrix[i];
    }

    return out;
  }

  /**
   * Sets `out` to `a * b`. Every element is read before any is written, so
   * `out` may be `a` or `b`.
   */
  private static _multiply(out: Matrix3, a: Matrix3, b: Matrix3): Matrix3 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[3];
    const b11 = b[4];
    const b12 = b[5];
    const b20 = b[6];
    const b21 = b[7];
    const b22 = b[8];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a00 * b10 + a10 * b11 + a20 * b12;
    out[4] = a01 * b10 + a11 * b11 + a21 * b12;
    out[5] = a02 * b10 + a12 * b11 + a22 * b12;
    out[6] = a00 * b20 + a10 * b21 + a20 * b22;
    out[7] = a01 * b20 + a11 * b21 + a21 * b22;
    out[8] = a02 * b20 + a12 * b21 + a22 * b22;

    return out;
  }
}
