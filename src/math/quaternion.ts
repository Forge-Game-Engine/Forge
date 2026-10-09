import type { Matrix3 } from './matrices/matrix3.js';
import type { Matrix4 } from './matrices/matrix4.js';
import { isParallelToUp, setQuaternionFromRotation } from './rotation-basis.js';
import type { Vector3 } from './vector3.js';

/**
 * A rotation in 3D, stored as a unit quaternion: `x`, `y` and `z` are the
 * vector part and `w` the scalar part (the Hamilton convention). `q` and
 * `-q` are the same rotation.
 *
 * A positive rotation about an axis turns counter-clockwise when looking
 * down the axis towards the origin (the right-hand rule), so a rotation
 * about `+Z` turns `+X` towards `+Y`, the same as a 2D angle.
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Yaw, pitch and roll angles in radians, read from a rotation by
 * {@link Quat.toYawPitchRoll}.
 */
export interface YawPitchRoll {
  /** The rotation about `Y`, applied first. */
  yaw: number;
  /** The rotation about the yawed `X`, applied second. */
  pitch: number;
  /** The rotation about the yawed and pitched `Z`, applied last. */
  roll: number;
}

/**
 * Below this `|cos θ|` slerp's `sin θ` is accurate enough to divide by;
 * above it the two rotations are nearly the same, and a normalized lerp is
 * used instead.
 */
const slerpLinearThreshold = 1 - 1e-6;

/**
 * Above this `|sin(pitch)|` a rotation counts as pitched straight up or
 * down, where yaw and roll turn about the same axis.
 */
const gimbalLockThreshold = 1 - 1e-12;

/**
 * Below this `1 + from · to` two directions count as opposite, so their
 * cross product is too short to use as the rotation axis.
 */
const oppositeThreshold = 1e-12;

/**
 * Static operations on {@link Quaternion}. Every operation that writes a
 * quaternion writes into its first argument (`target` or `out`) and
 * returns it, so no operation allocates except {@link Quat.clone} and the
 * {@link Quat.identity} getter.
 *
 * Use quaternions for rotations in engine and game code. Euler angles
 * ({@link Quat.fromYawPitchRoll}, {@link Quat.toYawPitchRoll}) are only for
 * input and display.
 */
export class Quat {
  /**
   * The identity rotation (0, 0, 0, 1). A fresh quaternion is created on
   * every access, so it's always safe to mutate.
   */
  static get identity(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  /**
   * Sets a quaternion's components to match another quaternion.
   * @param target - The quaternion to mutate.
   * @param value - The quaternion to copy components from.
   * @returns `target`, for chaining.
   */
  public static set(target: Quaternion, value: Quaternion): Quaternion {
    target.x = value.x;
    target.y = value.y;
    target.z = value.z;
    target.w = value.w;

    return target;
  }

  /**
   * Sets a quaternion's components.
   * @param target - The quaternion to mutate.
   * @param x - The x component.
   * @param y - The y component.
   * @param z - The z component.
   * @param w - The scalar component.
   * @returns `target`, for chaining.
   */
  public static setComponents(
    target: Quaternion,
    x: number,
    y: number,
    z: number,
    w: number,
  ): Quaternion {
    target.x = x;
    target.y = y;
    target.z = z;
    target.w = w;

    return target;
  }

  /**
   * Sets `out` to a rotation about an axis.
   * @param out - The quaternion to write.
   * @param axis - The axis, unit length.
   * @param radians - The angle; positive turns counter-clockwise looking
   * down the axis towards the origin.
   * @returns `out`, for chaining.
   */
  public static fromAxisAngle(
    out: Quaternion,
    axis: Vector3,
    radians: number,
  ): Quaternion {
    const halfAngle = radians / 2;
    const sine = Math.sin(halfAngle);

    out.x = axis.x * sine;
    out.y = axis.y * sine;
    out.z = axis.z * sine;
    out.w = Math.cos(halfAngle);

    return out;
  }

  /**
   * Sets `out` to the rotation that yaws about `Y`, then pitches about the
   * yawed `X`, then rolls about the yawed and pitched `Z`. For a camera,
   * yaw turns left and right, pitch looks up and down, and roll tilts the
   * view.
   * @param out - The quaternion to write.
   * @param yaw - The rotation about `Y`, in radians.
   * @param pitch - The rotation about `X`, in radians.
   * @param roll - The rotation about `Z`, in radians.
   * @returns `out`, for chaining.
   */
  public static fromYawPitchRoll(
    out: Quaternion,
    yaw: number,
    pitch: number,
    roll: number,
  ): Quaternion {
    const cy = Math.cos(yaw / 2);
    const sy = Math.sin(yaw / 2);
    const cx = Math.cos(pitch / 2);
    const sx = Math.sin(pitch / 2);
    const cz = Math.cos(roll / 2);
    const sz = Math.sin(roll / 2);

    // The product q(yaw) * q(pitch) * q(roll), expanded.
    out.x = cy * sx * cz + sy * cx * sz;
    out.y = sy * cx * cz - cy * sx * sz;
    out.z = cy * cx * sz - sy * sx * cz;
    out.w = cy * cx * cz + sy * sx * sz;

    return out;
  }

  /**
   * Reads the yaw, pitch and roll that {@link Quat.fromYawPitchRoll} builds
   * a rotation from. Pitch is from `-π/2` to `π/2`; yaw and roll are from
   * `-π` to `π`. At a pitch of `±π/2`, yaw and roll turn about the same
   * axis, so roll is returned as `0` and the whole turn as yaw.
   * @param out - The angles to write.
   * @param quaternion - The rotation, a unit quaternion.
   * @returns `out`, for chaining.
   */
  public static toYawPitchRoll(
    out: YawPitchRoll,
    quaternion: Quaternion,
  ): YawPitchRoll {
    const { x, y, z, w } = quaternion;
    // Elements of the rotation matrix Ry * Rx * Rz, row then column.
    const m12 = 2 * (y * z - x * w);
    const sinPitch = Math.min(1, Math.max(-1, -m12));

    out.pitch = Math.asin(sinPitch);

    if (Math.abs(sinPitch) > gimbalLockThreshold) {
      const m00 = 1 - 2 * (y * y + z * z);
      const m20 = 2 * (x * z - y * w);

      out.yaw = Math.atan2(-m20, m00);
      out.roll = 0;

      return out;
    }

    const m02 = 2 * (x * z + y * w);
    const m22 = 1 - 2 * (x * x + y * y);
    const m10 = 2 * (x * y + z * w);
    const m11 = 1 - 2 * (x * x + z * z);

    out.yaw = Math.atan2(m02, m22);
    out.roll = Math.atan2(m10, m11);

    return out;
  }

  /**
   * Sets `out` to a rotation about `Z` by a 2D angle: angle `0` points
   * along `+X`, and a positive angle turns `+X` towards `+Y`.
   * @param out - The quaternion to write.
   * @param radians - The angle.
   * @returns `out`, for chaining.
   */
  public static fromAngleZ(out: Quaternion, radians: number): Quaternion {
    out.x = 0;
    out.y = 0;
    out.z = Math.sin(radians / 2);
    out.w = Math.cos(radians / 2);

    return out;
  }

  /**
   * Reads the 2D angle of a rotation: its twist about `Z`. For a rotation
   * about `Z` alone this is exactly the angle {@link Quat.fromAngleZ} was
   * given; for any other rotation it's the part of the rotation about `Z`
   * (the swing-twist decomposition).
   * @param quaternion - The rotation, a unit quaternion.
   * @returns The angle in radians, from `-π` to `π`. `0` for a half turn
   * about an axis in the XY plane, which has no twist about `Z`.
   */
  public static angleZ(quaternion: Quaternion): number {
    const angle = 2 * Math.atan2(quaternion.z, quaternion.w);

    if (angle > Math.PI) {
      return angle - 2 * Math.PI;
    }

    if (angle <= -Math.PI) {
      return angle + 2 * Math.PI;
    }

    return angle;
  }

  /**
   * Sets `out` to the shortest rotation that turns the direction `from`
   * into the direction `to`.
   * @param out - The quaternion to write.
   * @param from - The start direction, unit length.
   * @param to - The end direction, unit length.
   * @returns `out`, for chaining. For opposite directions, a half turn about
   * an axis perpendicular to `from`.
   */
  public static fromUnitVectors(
    out: Quaternion,
    from: Vector3,
    to: Vector3,
  ): Quaternion {
    const dot = from.x * to.x + from.y * to.y + from.z * to.z;

    if (1 + dot < oppositeThreshold) {
      // Opposite directions: any perpendicular axis works. Cross with the
      // world axis least aligned with `from`, so the axis is never short.
      let axisX: number;
      let axisY: number;
      let axisZ: number;

      if (Math.abs(from.x) < Math.abs(from.y)) {
        // from × (1, 0, 0)
        axisX = 0;
        axisY = from.z;
        axisZ = -from.y;
      } else {
        // from × (0, 1, 0)
        axisX = -from.z;
        axisY = 0;
        axisZ = from.x;
      }

      const length = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);

      out.x = axisX / length;
      out.y = axisY / length;
      out.z = axisZ / length;
      out.w = 0;

      return out;
    }

    out.x = from.y * to.z - from.z * to.y;
    out.y = from.z * to.x - from.x * to.z;
    out.z = from.x * to.y - from.y * to.x;
    out.w = 1 + dot;

    return Quat.normalize(out);
  }

  /**
   * Sets `out` to the rotation that turns `-Z` (the forward direction of
   * cameras, lights and anything that aims) to `forward`, with `+Y` as
   * close to `up` as possible.
   * @param out - The quaternion to write.
   * @param forward - The direction to face. It doesn't need to be unit
   * length.
   * @param up - The direction `+Y` should be closest to. If it's parallel to
   * `forward`, `Vec3.up` is used instead, or `Vec3.forward` when `forward`
   * is vertical.
   * @returns `out`, for chaining.
   * @throws An error if `forward` is a zero vector.
   */
  public static lookRotation(
    out: Quaternion,
    forward: Vector3,
    up: Vector3,
  ): Quaternion {
    return Quat._fromLookBasis(out, -forward.x, -forward.y, -forward.z, up);
  }

  /**
   * Sets `out` to the rotation that turns `+Z` (the direction a model's
   * front faces, `Vec3.modelFront`) to `front`, with `+Y` as close to `up`
   * as possible.
   * @param out - The quaternion to write.
   * @param front - The direction the model's front should face. It doesn't
   * need to be unit length.
   * @param up - The direction `+Y` should be closest to. If it's parallel to
   * `front`, `Vec3.up` is used instead, or `Vec3.forward` when `front` is
   * vertical.
   * @returns `out`, for chaining.
   * @throws An error if `front` is a zero vector.
   */
  public static modelLookRotation(
    out: Quaternion,
    front: Vector3,
    up: Vector3,
  ): Quaternion {
    return Quat._fromLookBasis(out, front.x, front.y, front.z, up);
  }

  /**
   * Sets `out` to the rotation of a 3x3 rotation matrix. A matrix that also
   * scales is normalized first, so its rotation is read; a matrix that
   * mirrors has its X axis flipped, as {@link Mat4.decompose} does.
   * @param out - The quaternion to write.
   * @param matrix - The rotation (or rotation and scale) matrix, with no
   * zero scale.
   * @returns `out`, for chaining.
   */
  public static fromMatrix3(out: Quaternion, matrix: Matrix3): Quaternion {
    return Quat._fromBasis(out, matrix, 3);
  }

  /**
   * Sets `out` to the rotation of a 4x4 matrix's upper-left 3x3. A matrix
   * that also scales is normalized first, so its rotation is read; a matrix
   * that mirrors has its X axis flipped, as {@link Mat4.decompose} does.
   * @param out - The quaternion to write.
   * @param matrix - The matrix, with no zero scale.
   * @returns `out`, for chaining.
   */
  public static fromMatrix4(out: Quaternion, matrix: Matrix4): Quaternion {
    return Quat._fromBasis(out, matrix, 4);
  }

  /**
   * Sets `target` to `target * value`: the rotation that applies `value`
   * first, then `target`, so a world rotation is the parent's world
   * rotation times the local rotation.
   * @param target - The quaternion to write, the left operand.
   * @param value - The right operand.
   * @returns `target`, for chaining.
   */
  public static multiply(target: Quaternion, value: Quaternion): Quaternion {
    return Quat._multiply(target, target, value);
  }

  /**
   * Sets `target` to `value * target`: the rotation that applies `target`
   * first, then `value`.
   * @param target - The quaternion to write, the right operand.
   * @param value - The left operand.
   * @returns `target`, for chaining.
   */
  public static premultiply(target: Quaternion, value: Quaternion): Quaternion {
    return Quat._multiply(target, value, target);
  }

  /**
   * Negates `target`'s vector part. For a unit quaternion this is the
   * inverse rotation; prefer {@link Quat.invert}, which is also correct for
   * a quaternion that isn't unit length.
   * @param target - The quaternion to mutate.
   * @returns `target`, for chaining.
   */
  public static conjugate(target: Quaternion): Quaternion {
    target.x = -target.x;
    target.y = -target.y;
    target.z = -target.z;

    return target;
  }

  /**
   * Sets `target` to its inverse, the rotation that undoes it.
   * @param target - The quaternion to mutate.
   * @returns `target`, for chaining.
   * @throws An error if `target` is a zero quaternion, which has no inverse.
   */
  public static invert(target: Quaternion): Quaternion {
    const lengthSquared = Quat.dot(target, target);

    if (lengthSquared === 0) {
      throw new Error('Unable to invert a zero Quaternion.');
    }

    target.x = -target.x / lengthSquared;
    target.y = -target.y / lengthSquared;
    target.z = -target.z / lengthSquared;
    target.w = target.w / lengthSquared;

    return target;
  }

  /**
   * Scales `target` to unit length.
   * @param target - The quaternion to mutate.
   * @returns `target`, for chaining.
   * @throws An error if `target` is a zero quaternion, which isn't a
   * rotation.
   */
  public static normalize(target: Quaternion): Quaternion {
    const length = Math.sqrt(Quat.dot(target, target));

    if (length === 0) {
      throw new Error('Unable to normalize a zero Quaternion.');
    }

    target.x /= length;
    target.y /= length;
    target.z /= length;
    target.w /= length;

    return target;
  }

  /**
   * Calculates the 4D dot product of two quaternions. For unit quaternions
   * its absolute value is the cosine of half the angle between them.
   * @param a - The first quaternion.
   * @param b - The second quaternion.
   * @returns `a · b`.
   */
  public static dot(a: Quaternion, b: Quaternion): number {
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  }

  /**
   * Spherically interpolates `target` towards `value` along the shortest
   * path, at a constant angular speed.
   * @param target - The quaternion to write, the rotation at `t = 0`.
   * @param value - The rotation at `t = 1`.
   * @param t - The interpolation factor, from `0` to `1`.
   * @returns `target`, for chaining.
   */
  public static slerp(
    target: Quaternion,
    value: Quaternion,
    t: number,
  ): Quaternion {
    let cosine = Quat.dot(target, value);
    const sign = cosine < 0 ? -1 : 1;

    cosine *= sign;

    if (cosine > slerpLinearThreshold) {
      return Quat.nlerp(target, value, t);
    }

    const angle = Math.acos(cosine);
    const inverseSine = 1 / Math.sin(angle);
    const fromWeight = Math.sin((1 - t) * angle) * inverseSine;
    const toWeight = Math.sin(t * angle) * inverseSine * sign;

    target.x = target.x * fromWeight + value.x * toWeight;
    target.y = target.y * fromWeight + value.y * toWeight;
    target.z = target.z * fromWeight + value.z * toWeight;
    target.w = target.w * fromWeight + value.w * toWeight;

    return target;
  }

  /**
   * Linearly interpolates `target` towards `value` along the shortest path
   * and normalizes the result. Cheaper than {@link Quat.slerp}, but its
   * angular speed isn't constant, for example to blend animation poses.
   * @param target - The quaternion to write, the rotation at `t = 0`.
   * @param value - The rotation at `t = 1`.
   * @param t - The interpolation factor, from `0` to `1`.
   * @returns `target`, for chaining.
   */
  public static nlerp(
    target: Quaternion,
    value: Quaternion,
    t: number,
  ): Quaternion {
    const toWeight = Quat.dot(target, value) < 0 ? -t : t;
    const fromWeight = 1 - t;

    target.x = target.x * fromWeight + value.x * toWeight;
    target.y = target.y * fromWeight + value.y * toWeight;
    target.z = target.z * fromWeight + value.z * toWeight;
    target.w = target.w * fromWeight + value.w * toWeight;

    return Quat.normalize(target);
  }

  /**
   * Turns `target` towards `value` by at most `maxRadians`, for turning at
   * a constant angular speed.
   * @param target - The quaternion to write.
   * @param value - The rotation to turn towards.
   * @param maxRadians - The largest angle to turn by.
   * @returns `target`, for chaining. It's set to `value` if `value` is
   * within `maxRadians`.
   */
  public static rotateTowards(
    target: Quaternion,
    value: Quaternion,
    maxRadians: number,
  ): Quaternion {
    const angle = Quat.angleBetween(target, value);

    if (angle <= maxRadians) {
      return Quat.set(target, value);
    }

    return Quat.slerp(target, value, maxRadians / angle);
  }

  /**
   * Calculates the angle of the rotation that turns `a` into `b`.
   * @param a - The first rotation, a unit quaternion.
   * @param b - The second rotation, a unit quaternion.
   * @returns The angle in radians, from `0` to `π`.
   */
  public static angleBetween(a: Quaternion, b: Quaternion): number {
    // The difference conj(a) * b, whose vector length is sin(θ/2) and whose
    // scalar part is cos(θ/2); atan2 keeps small angles accurate.
    const x = a.w * b.x - a.x * b.w - a.y * b.z + a.z * b.y;
    const y = a.w * b.y + a.x * b.z - a.y * b.w - a.z * b.x;
    const z = a.w * b.z - a.x * b.y + a.y * b.x - a.z * b.w;
    const w = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

    return 2 * Math.atan2(Math.sqrt(x * x + y * y + z * z), Math.abs(w));
  }

  /**
   * Checks if two quaternions are the same rotation, within a tolerance.
   * `q` and `-q` are the same rotation, so they're equal.
   * @param a - The first quaternion.
   * @param b - The second quaternion.
   * @param tolerance - The largest difference allowed in each component.
   * @returns `true` if `a` and `b`, or `a` and `-b`, differ by at most
   * `tolerance` in every component.
   */
  public static equals(
    a: Quaternion,
    b: Quaternion,
    tolerance: number = 1e-9,
  ): boolean {
    const sameSign =
      Math.abs(a.x - b.x) <= tolerance &&
      Math.abs(a.y - b.y) <= tolerance &&
      Math.abs(a.z - b.z) <= tolerance &&
      Math.abs(a.w - b.w) <= tolerance;

    return (
      sameSign ||
      (Math.abs(a.x + b.x) <= tolerance &&
        Math.abs(a.y + b.y) <= tolerance &&
        Math.abs(a.z + b.z) <= tolerance &&
        Math.abs(a.w + b.w) <= tolerance)
    );
  }

  /**
   * Checks if two quaternions have exactly the same components. Unlike
   * {@link Quat.equals}, `q` and `-q` aren't equal.
   * @param a - The first quaternion.
   * @param b - The second quaternion.
   * @returns `true` if every component is the same.
   */
  public static exactlyEquals(a: Quaternion, b: Quaternion): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w;
  }

  /**
   * Creates a copy of a quaternion.
   * @param quaternion - The quaternion to copy.
   * @returns A new `Quaternion` with the same components.
   */
  public static clone(quaternion: Quaternion): Quaternion {
    return {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    };
  }

  /**
   * Sets `out` to `a * b`, reading every component before writing any, so
   * `out` may be `a` or `b`.
   */
  private static _multiply(
    out: Quaternion,
    a: Quaternion,
    b: Quaternion,
  ): Quaternion {
    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const aw = a.w;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;
    const bw = b.w;

    out.x = aw * bx + ax * bw + ay * bz - az * by;
    out.y = aw * by - ax * bz + ay * bw + az * bx;
    out.z = aw * bz + ax * by - ay * bx + az * bw;
    out.w = aw * bw - ax * bx - ay * by - az * bz;

    return out;
  }

  /**
   * Sets `out` to the rotation of the first three columns of a matrix with
   * `stride` rows per column, normalizing each column and flipping the X
   * column when the matrix mirrors.
   */
  private static _fromBasis(
    out: Quaternion,
    matrix: readonly number[],
    stride: number,
  ): Quaternion {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a10 = matrix[stride];
    const a11 = matrix[stride + 1];
    const a12 = matrix[stride + 2];
    const a20 = matrix[stride * 2];
    const a21 = matrix[stride * 2 + 1];
    const a22 = matrix[stride * 2 + 2];
    const determinant =
      a00 * (a11 * a22 - a12 * a21) -
      a10 * (a01 * a22 - a02 * a21) +
      a20 * (a01 * a12 - a02 * a11);
    const scaleX =
      Math.sign(determinant || 1) *
      Math.sqrt(a00 * a00 + a01 * a01 + a02 * a02);
    const scaleY = Math.sqrt(a10 * a10 + a11 * a11 + a12 * a12);
    const scaleZ = Math.sqrt(a20 * a20 + a21 * a21 + a22 * a22);

    return setQuaternionFromRotation(
      out,
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
   * Sets `out` to the rotation that turns `+Z` to the direction
   * `(zx, zy, zz)`, with `+Y` as close to `up` as possible.
   */
  private static _fromLookBasis(
    out: Quaternion,
    zx: number,
    zy: number,
    zz: number,
    up: Vector3,
  ): Quaternion {
    const zLength = Math.sqrt(zx * zx + zy * zy + zz * zz);

    if (zLength === 0) {
      throw new Error(
        'Unable to build a look rotation from a zero-length direction.',
      );
    }

    const bx = zx / zLength;
    const by = zy / zLength;
    const bz = zz / zLength;
    let ux = up.x;
    let uy = up.y;
    let uz = up.z;
    let xx = uy * bz - uz * by;
    let xy = uz * bx - ux * bz;
    let xz = ux * by - uy * bx;
    let xLengthSquared = xx * xx + xy * xy + xz * xz;

    if (isParallelToUp(xLengthSquared, up)) {
      const isVertical = Math.abs(by) > Math.abs(bz);

      ux = 0;
      uy = isVertical ? 0 : 1;
      uz = isVertical ? -1 : 0;
      xx = uy * bz - uz * by;
      xy = uz * bx - ux * bz;
      xz = ux * by - uy * bx;
      xLengthSquared = xx * xx + xy * xy + xz * xz;
    }

    const xLength = Math.sqrt(xLengthSquared);

    xx /= xLength;
    xy /= xLength;
    xz /= xLength;

    // The columns of the rotation are x, y = z × x and z.
    const yx = by * xz - bz * xy;
    const yy = bz * xx - bx * xz;
    const yz = bx * xy - by * xx;

    return setQuaternionFromRotation(out, xx, yy, bz, xy, yx, xz, bx, yz, by);
  }
}
