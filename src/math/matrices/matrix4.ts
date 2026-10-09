import type { Brand } from '../../utilities/types/brand.js';
import type { Quaternion } from '../quaternion.js';
import type { Rect } from '../rect.js';
import {
  isParallelToUp,
  setQuaternionFromRotation,
} from '../rotation-basis.js';
import type { Vector3 } from '../vector3.js';
import type { Matrix3 } from './matrix3.js';

/**
 * A 4x4 matrix: 16 numbers in column-major order, acting on column vectors
 * (`M * v`), as GLSL does. Element `m[c * 4 + r]` is row `r`, column `c`, so
 * a transform's translation is `m[12]`, `m[13]` and `m[14]`.
 *
 * It's a plain `number[]` (64-bit, created from an array literal so the
 * engine stores it as packed doubles), branded so a {@link Matrix3} can't be
 * passed where a `Matrix4` is expected. Create one with {@link Mat4.create}.
 */
export type Matrix4 = Brand<number[], 'Matrix4'>;

/**
 * The range clip-space depth is mapped to: `'negativeOneToOne'` (`-1` at
 * the near plane, `1` at the far plane, WebGL's default) or `'zeroToOne'`
 * (`0` to `1`, WebGPU's). Every function that builds or reads a projection
 * takes the range of the backend it's for.
 */
export type DepthRange = 'negativeOneToOne' | 'zeroToOne';

/**
 * Static operations on {@link Matrix4}. Every operation that writes a
 * matrix or vector writes into its first argument (`target` or `out`) and
 * returns it, so no operation allocates except {@link Mat4.create} and
 * {@link Mat4.clone}. `target` and `out` may be the same matrix as any
 * other argument.
 */
export class Mat4 {
  /**
   * Creates a new identity matrix.
   * @returns A new `Matrix4`.
   */
  public static create(): Matrix4 {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  /**
   * Sets a matrix to the identity.
   * @param out - The matrix to write.
   * @returns `out`, for chaining.
   */
  public static identity(out: Matrix4): Matrix4 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
  }

  /**
   * Copies a matrix's elements into another.
   * @param out - The matrix to write.
   * @param matrix - The matrix to copy.
   * @returns `out`, for chaining.
   */
  public static copy(out: Matrix4, matrix: Matrix4): Matrix4 {
    for (let i = 0; i < 16; i++) {
      out[i] = matrix[i];
    }

    return out;
  }

  /**
   * Creates a copy of a matrix.
   * @param matrix - The matrix to copy.
   * @returns A new `Matrix4` with the same elements.
   */
  public static clone(matrix: Matrix4): Matrix4 {
    return Mat4.copy(Mat4.create(), matrix);
  }

  /**
   * Sets `target` to `target * value`: the transform that applies `value`
   * first, then `target`, so a world matrix is the parent's world matrix
   * times the local matrix.
   * @param target - The matrix to write, the left operand.
   * @param value - The right operand.
   * @returns `target`, for chaining.
   */
  public static multiply(target: Matrix4, value: Matrix4): Matrix4 {
    return Mat4._multiply(target, target, value);
  }

  /**
   * Sets `target` to `value * target`: the transform that applies `target`
   * first, then `value`.
   * @param target - The matrix to write, the right operand.
   * @param value - The left operand.
   * @returns `target`, for chaining.
   */
  public static premultiply(target: Matrix4, value: Matrix4): Matrix4 {
    return Mat4._multiply(target, value, target);
  }

  /**
   * Sets `target` to `target * value` for two affine matrices (bottom row
   * `0, 0, 0, 1`), skipping the bottom row: 36 multiplications instead of
   * 64. The result's bottom row is `0, 0, 0, 1`.
   * @param target - The matrix to write, the left operand.
   * @param value - The right operand.
   * @returns `target`, for chaining.
   */
  public static multiplyAffine(target: Matrix4, value: Matrix4): Matrix4 {
    return Mat4._multiplyAffine(target, target, value);
  }

  /**
   * Sets `target` to `value * target` for two affine matrices (bottom row
   * `0, 0, 0, 1`), skipping the bottom row.
   * @param target - The matrix to write, the right operand.
   * @param value - The left operand.
   * @returns `target`, for chaining.
   */
  public static premultiplyAffine(target: Matrix4, value: Matrix4): Matrix4 {
    return Mat4._multiplyAffine(target, value, target);
  }

  /**
   * Sets `out` to the transform that scales, then rotates, then translates:
   * `T * R * S`.
   * @param out - The matrix to write.
   * @param position - The translation.
   * @param rotation - The rotation, a unit quaternion.
   * @param scale - The scale along each local axis.
   * @returns `out`, for chaining.
   */
  public static fromTransform(
    out: Matrix4,
    position: Vector3,
    rotation: Quaternion,
    scale: Vector3,
  ): Matrix4 {
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
    const sx = scale.x;
    const sy = scale.y;
    const sz = scale.z;

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = position.x;
    out[13] = position.y;
    out[14] = position.z;
    out[15] = 1;

    return out;
  }

  /**
   * Sets `out` to a rotation matrix.
   * @param out - The matrix to write.
   * @param rotation - The rotation, a unit quaternion.
   * @returns `out`, for chaining.
   */
  public static fromQuat(out: Matrix4, rotation: Quaternion): Matrix4 {
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
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
  }

  /**
   * Sets `out` to a translation matrix.
   * @param out - The matrix to write.
   * @param translation - The translation.
   * @returns `out`, for chaining.
   */
  public static fromTranslation(out: Matrix4, translation: Vector3): Matrix4 {
    Mat4.identity(out);
    out[12] = translation.x;
    out[13] = translation.y;
    out[14] = translation.z;

    return out;
  }

  /**
   * Sets `out` to a scale matrix.
   * @param out - The matrix to write.
   * @param scale - The scale along each axis.
   * @returns `out`, for chaining.
   */
  public static fromScale(out: Matrix4, scale: Vector3): Matrix4 {
    Mat4.identity(out);
    out[0] = scale.x;
    out[5] = scale.y;
    out[10] = scale.z;

    return out;
  }

  /**
   * Sets `out` to a 3x3 matrix in its upper-left corner, with no
   * translation.
   * @param out - The matrix to write.
   * @param matrix - The 3x3 matrix.
   * @returns `out`, for chaining.
   */
  public static fromMatrix3(out: Matrix4, matrix: Matrix3): Matrix4 {
    out[0] = matrix[0];
    out[1] = matrix[1];
    out[2] = matrix[2];
    out[3] = 0;
    out[4] = matrix[3];
    out[5] = matrix[4];
    out[6] = matrix[5];
    out[7] = 0;
    out[8] = matrix[6];
    out[9] = matrix[7];
    out[10] = matrix[8];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
  }

  /**
   * Sets `out` to the inverse of a matrix.
   * @param out - The matrix to write.
   * @param matrix - The matrix to invert.
   * @returns `out`, or `null` if `matrix` is singular (its determinant is
   * `0`, for example a transform with a zero scale), in which case `out`
   * isn't changed.
   */
  public static invert(out: Matrix4, matrix: Matrix4): Matrix4 | null {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a03 = matrix[3];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a13 = matrix[7];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const a23 = matrix[11];
    const a30 = matrix[12];
    const a31 = matrix[13];
    const a32 = matrix[14];
    const a33 = matrix[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    const determinant =
      b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (determinant === 0) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inverseDeterminant;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inverseDeterminant;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inverseDeterminant;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inverseDeterminant;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inverseDeterminant;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inverseDeterminant;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inverseDeterminant;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inverseDeterminant;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inverseDeterminant;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inverseDeterminant;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inverseDeterminant;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inverseDeterminant;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inverseDeterminant;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inverseDeterminant;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inverseDeterminant;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inverseDeterminant;

    return out;
  }

  /**
   * Sets `out` to the inverse of an affine matrix (bottom row
   * `0, 0, 0, 1`), such as a world or view matrix. Cheaper than
   * {@link Mat4.invert}: it inverts the upper-left 3x3 and moves the
   * translation through it.
   * @param out - The matrix to write.
   * @param matrix - The affine matrix to invert.
   * @returns `out`, or `null` if `matrix` is singular, in which case `out`
   * isn't changed.
   */
  public static invertAffine(out: Matrix4, matrix: Matrix4): Matrix4 | null {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const tx = matrix[12];
    const ty = matrix[13];
    const tz = matrix[14];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    const determinant = a00 * b01 + a01 * b11 + a02 * b21;

    if (determinant === 0) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;
    const i00 = b01 * inverseDeterminant;
    const i01 = (-a22 * a01 + a02 * a21) * inverseDeterminant;
    const i02 = (a12 * a01 - a02 * a11) * inverseDeterminant;
    const i10 = b11 * inverseDeterminant;
    const i11 = (a22 * a00 - a02 * a20) * inverseDeterminant;
    const i12 = (-a12 * a00 + a02 * a10) * inverseDeterminant;
    const i20 = b21 * inverseDeterminant;
    const i21 = (-a21 * a00 + a01 * a20) * inverseDeterminant;
    const i22 = (a11 * a00 - a01 * a10) * inverseDeterminant;

    out[0] = i00;
    out[1] = i01;
    out[2] = i02;
    out[3] = 0;
    out[4] = i10;
    out[5] = i11;
    out[6] = i12;
    out[7] = 0;
    out[8] = i20;
    out[9] = i21;
    out[10] = i22;
    out[11] = 0;
    out[12] = -(i00 * tx + i10 * ty + i20 * tz);
    out[13] = -(i01 * tx + i11 * ty + i21 * tz);
    out[14] = -(i02 * tx + i12 * ty + i22 * tz);
    out[15] = 1;

    return out;
  }

  /**
   * Transposes a matrix in place, swapping its rows and columns.
   * @param target - The matrix to transpose.
   * @returns `target`, for chaining.
   */
  public static transpose(target: Matrix4): Matrix4 {
    const a01 = target[1];
    const a02 = target[2];
    const a03 = target[3];
    const a12 = target[6];
    const a13 = target[7];
    const a23 = target[11];

    target[1] = target[4];
    target[2] = target[8];
    target[3] = target[12];
    target[4] = a01;
    target[6] = target[9];
    target[7] = target[13];
    target[8] = a02;
    target[9] = a12;
    target[11] = target[14];
    target[12] = a03;
    target[13] = a13;
    target[14] = a23;

    return target;
  }

  /**
   * Calculates a matrix's determinant. It's negative for a transform that
   * mirrors, and `0` for one that flattens space (a zero scale).
   * @param matrix - The matrix.
   * @returns The determinant.
   */
  public static determinant(matrix: Matrix4): number {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a03 = matrix[3];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a13 = matrix[7];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const a23 = matrix[11];
    const a30 = matrix[12];
    const a31 = matrix[13];
    const a32 = matrix[14];
    const a33 = matrix[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    return (
      b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    );
  }

  /**
   * Splits an affine matrix into the position, rotation and scale that
   * {@link Mat4.fromTransform} builds it from. A matrix that mirrors (a
   * negative determinant) is given a negative X scale. A matrix with shear,
   * which `fromTransform` can't build, has no exact decomposition.
   * @param outPosition - Set to the matrix's translation.
   * @param outRotation - Set to the matrix's rotation. The identity if any
   * scale is `0`, since the rotation is then undefined.
   * @param outScale - Set to the length of each basis column.
   * @param matrix - The affine matrix to decompose.
   */
  public static decompose(
    outPosition: Vector3,
    outRotation: Quaternion,
    outScale: Vector3,
    matrix: Matrix4,
  ): void {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const determinant =
      a00 * (a11 * a22 - a12 * a21) -
      a10 * (a01 * a22 - a02 * a21) +
      a20 * (a01 * a12 - a02 * a11);
    const scaleX =
      Math.sign(determinant || 1) *
      Math.sqrt(a00 * a00 + a01 * a01 + a02 * a02);
    const scaleY = Math.sqrt(a10 * a10 + a11 * a11 + a12 * a12);
    const scaleZ = Math.sqrt(a20 * a20 + a21 * a21 + a22 * a22);

    outPosition.x = matrix[12];
    outPosition.y = matrix[13];
    outPosition.z = matrix[14];
    outScale.x = scaleX;
    outScale.y = scaleY;
    outScale.z = scaleZ;

    if (scaleX === 0 || scaleY === 0 || scaleZ === 0) {
      outRotation.x = 0;
      outRotation.y = 0;
      outRotation.z = 0;
      outRotation.w = 1;

      return;
    }

    setQuaternionFromRotation(
      outRotation,
      a00 / scaleX,
      a11 / scaleY,
      a22 / scaleZ,
      a01 / scaleX,
      a10 / scaleY,
      a02 / scaleX,
      a20 / scaleZ,
      a12 / scaleY,
      a21 / scaleZ,
    );
  }

  /**
   * Reads a matrix's translation.
   * @param out - Set to the translation, `m[12]`, `m[13]` and `m[14]`.
   * @param matrix - The matrix.
   * @returns `out`, for chaining.
   */
  public static getTranslation(out: Vector3, matrix: Matrix4): Vector3 {
    out.x = matrix[12];
    out.y = matrix[13];
    out.z = matrix[14];

    return out;
  }

  /**
   * Calculates the largest scale a matrix applies along any of its basis
   * axes, for example to scale a bounding sphere's radius.
   * @param matrix - The matrix.
   * @returns The length of the longest of the first three columns.
   */
  public static getMaxScale(matrix: Matrix4): number {
    const x =
      matrix[0] * matrix[0] + matrix[1] * matrix[1] + matrix[2] * matrix[2];
    const y =
      matrix[4] * matrix[4] + matrix[5] * matrix[5] + matrix[6] * matrix[6];
    const z =
      matrix[8] * matrix[8] + matrix[9] * matrix[9] + matrix[10] * matrix[10];

    return Math.sqrt(Math.max(x, y, z));
  }

  /**
   * Sets `out` to a view matrix: the transform from world space into the
   * space of a camera at `eye` looking at `target`, which looks along `-Z`
   * with `+Y` up. It's the inverse of {@link Mat4.targetTo}.
   * @param out - The matrix to write.
   * @param eye - The camera's position.
   * @param target - The point the camera looks at.
   * @param up - The direction that should be up on screen. If it's parallel
   * to the view direction, `Vec3.up` is used instead, or `Vec3.forward` when
   * the view direction is vertical.
   * @returns `out`, for chaining.
   * @throws An error if `eye` and `target` are the same point.
   */
  public static lookAt(
    out: Matrix4,
    eye: Vector3,
    target: Vector3,
    up: Vector3,
  ): Matrix4 {
    Mat4.targetTo(out, eye, target, up);

    // The rotation is orthonormal, so its inverse is its transpose.
    const x0 = out[0];
    const x1 = out[1];
    const x2 = out[2];
    const y0 = out[4];
    const y1 = out[5];
    const y2 = out[6];
    const z0 = out[8];
    const z1 = out[9];
    const z2 = out[10];

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[12] = -(x0 * eye.x + x1 * eye.y + x2 * eye.z);
    out[13] = -(y0 * eye.x + y1 * eye.y + y2 * eye.z);
    out[14] = -(z0 * eye.x + z1 * eye.y + z2 * eye.z);

    return out;
  }

  /**
   * Sets `out` to the world matrix of an object at `eye` whose `-Z` axis
   * (its forward direction) points at `target`, with `+Y` as close to `up`
   * as possible. It's the inverse of {@link Mat4.lookAt}.
   * @param out - The matrix to write.
   * @param eye - The object's position.
   * @param target - The point the object faces.
   * @param up - The direction the object's `+Y` should be closest to. If it's
   * parallel to the direction to `target`, `Vec3.up` is used instead, or
   * `Vec3.forward` when that direction is vertical.
   * @returns `out`, for chaining.
   * @throws An error if `eye` and `target` are the same point.
   */
  public static targetTo(
    out: Matrix4,
    eye: Vector3,
    target: Vector3,
    up: Vector3,
  ): Matrix4 {
    let zx = eye.x - target.x;
    let zy = eye.y - target.y;
    let zz = eye.z - target.z;
    const zLength = Math.sqrt(zx * zx + zy * zy + zz * zz);

    if (zLength === 0) {
      throw new Error(
        'Unable to build a look matrix: the eye and target are the same point.',
      );
    }

    zx /= zLength;
    zy /= zLength;
    zz /= zLength;

    let ux = up.x;
    let uy = up.y;
    let uz = up.z;
    let xx = uy * zz - uz * zy;
    let xy = uz * zx - ux * zz;
    let xz = ux * zy - uy * zx;
    let xLengthSquared = xx * xx + xy * xy + xz * xz;

    if (isParallelToUp(xLengthSquared, up)) {
      const isVertical = Math.abs(zy) > Math.abs(zz);

      ux = 0;
      uy = isVertical ? 0 : 1;
      uz = isVertical ? -1 : 0;
      xx = uy * zz - uz * zy;
      xy = uz * zx - ux * zz;
      xz = ux * zy - uy * zx;
      xLengthSquared = xx * xx + xy * xy + xz * xz;
    }

    const xLength = Math.sqrt(xLengthSquared);

    xx /= xLength;
    xy /= xLength;
    xz /= xLength;

    out[0] = xx;
    out[1] = xy;
    out[2] = xz;
    out[3] = 0;
    out[4] = zy * xz - zz * xy;
    out[5] = zz * xx - zx * xz;
    out[6] = zx * xy - zy * xx;
    out[7] = 0;
    out[8] = zx;
    out[9] = zy;
    out[10] = zz;
    out[11] = 0;
    out[12] = eye.x;
    out[13] = eye.y;
    out[14] = eye.z;
    out[15] = 1;

    return out;
  }

  /**
   * Sets `out` to a perspective projection for a camera looking along `-Z`.
   * Points on the near plane map to the low end of `depthRange` and points
   * on the far plane to `1`.
   * @param out - The matrix to write.
   * @param fovY - The vertical field of view, in radians.
   * @param aspect - The viewport's width divided by its height.
   * @param near - The distance to the near plane, greater than `0`.
   * @param far - The distance to the far plane, greater than `near`.
   * @param depthRange - The clip-space depth range of the backend.
   * @returns `out`, for chaining.
   */
  public static perspective(
    out: Matrix4,
    fovY: number,
    aspect: number,
    near: number,
    far: number,
    depthRange: DepthRange,
  ): Matrix4 {
    const f = 1 / Math.tan(fovY / 2);
    const inverseRange = 1 / (near - far);

    Mat4._setPerspectiveBase(out, f, aspect);

    if (depthRange === 'zeroToOne') {
      out[10] = far * inverseRange;
      out[14] = far * near * inverseRange;

      return out;
    }

    out[10] = (far + near) * inverseRange;
    out[14] = 2 * far * near * inverseRange;

    return out;
  }

  /**
   * Sets `out` to a perspective projection with no far plane, the limit of
   * {@link Mat4.perspective} as `far` goes to infinity.
   * @param out - The matrix to write.
   * @param fovY - The vertical field of view, in radians.
   * @param aspect - The viewport's width divided by its height.
   * @param near - The distance to the near plane, greater than `0`.
   * @param depthRange - The clip-space depth range of the backend.
   * @returns `out`, for chaining.
   */
  public static perspectiveInfinite(
    out: Matrix4,
    fovY: number,
    aspect: number,
    near: number,
    depthRange: DepthRange,
  ): Matrix4 {
    const f = 1 / Math.tan(fovY / 2);

    Mat4._setPerspectiveBase(out, f, aspect);
    out[10] = -1;
    out[14] = depthRange === 'zeroToOne' ? -near : -2 * near;

    return out;
  }

  /**
   * Sets `out` to an orthographic projection for a camera looking along
   * `-Z`, mapping `bounds` to the clip-space `x` and `y` range `-1` to `1`.
   * @param out - The matrix to write.
   * @param bounds - The visible area in view space: `min` is the left and
   * bottom edge, `max` the right and top edge.
   * @param near - The distance to the near plane.
   * @param far - The distance to the far plane.
   * @param depthRange - The clip-space depth range of the backend.
   * @returns `out`, for chaining.
   */
  public static orthographic(
    out: Matrix4,
    bounds: Rect,
    near: number,
    far: number,
    depthRange: DepthRange,
  ): Matrix4 {
    const left = bounds.min.x;
    const right = bounds.max.x;
    const bottom = bounds.min.y;
    const top = bounds.max.y;
    const inverseWidth = 1 / (left - right);
    const inverseHeight = 1 / (bottom - top);
    const inverseDepth = 1 / (near - far);

    out[0] = -2 * inverseWidth;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * inverseHeight;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = (left + right) * inverseWidth;
    out[13] = (top + bottom) * inverseHeight;
    out[15] = 1;

    if (depthRange === 'zeroToOne') {
      out[10] = inverseDepth;
      out[14] = near * inverseDepth;

      return out;
    }

    out[10] = 2 * inverseDepth;
    out[14] = (far + near) * inverseDepth;

    return out;
  }

  /**
   * Writes a matrix's 16 elements into a `Float32Array`, for example a GPU
   * staging buffer, rounding each to 32 bits.
   * @param out - The array to write.
   * @param offset - The index of the first element to write.
   * @param matrix - The matrix.
   * @returns `out`, for chaining.
   */
  public static toFloat32(
    out: Float32Array,
    offset: number,
    matrix: Matrix4,
  ): Float32Array {
    for (let i = 0; i < 16; i++) {
      out[offset + i] = matrix[i];
    }

    return out;
  }

  /**
   * Sets `out` to `a * b`. Every element is read before any is written, so
   * `out` may be `a` or `b`.
   */
  private static _multiply(out: Matrix4, a: Matrix4, b: Matrix4): Matrix4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b03 = b[3];
    const b10 = b[4];
    const b11 = b[5];
    const b12 = b[6];
    const b13 = b[7];
    const b20 = b[8];
    const b21 = b[9];
    const b22 = b[10];
    const b23 = b[11];
    const b30 = b[12];
    const b31 = b[13];
    const b32 = b[14];
    const b33 = b[15];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

    return out;
  }

  /**
   * Sets `out` to `a * b` for affine `a` and `b`, reading every element
   * before writing any, so `out` may be `a` or `b`.
   */
  private static _multiplyAffine(
    out: Matrix4,
    a: Matrix4,
    b: Matrix4,
  ): Matrix4 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[4];
    const b11 = b[5];
    const b12 = b[6];
    const b20 = b[8];
    const b21 = b[9];
    const b22 = b[10];
    const b30 = b[12];
    const b31 = b[13];
    const b32 = b[14];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = 0;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = 0;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = 0;
    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32;
    out[15] = 1;

    return out;
  }

  /**
   * Writes the elements that every perspective projection shares: the
   * focal scales and the `w = -z` row.
   */
  private static _setPerspectiveBase(
    out: Matrix4,
    focalLength: number,
    aspect: number,
  ): void {
    out[0] = focalLength / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = focalLength;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
  }
}
