import type { Matrix3 } from './matrices/matrix3.js';
import type { Matrix4 } from './matrices/matrix4.js';
import type { Quaternion } from './quaternion.js';
import type { Vector2 } from './vector2.js';

/**
 * A plain three-dimensional vector with x, y, and z components.
 *
 * The 3D space is right-handed and Y-up: `+X` is right, `+Y` is up and `+Z`
 * points towards the viewer, so cameras and anything that aims look along
 * `-Z` ({@link Vec3.forward}).
 *
 * All mutating operations on {@link Vec3} mutate their `target` argument in
 * place and return it (for chaining) rather than allocating a new `Vector3`.
 * Callers that need to preserve the original value must clone it first with
 * {@link Vec3.clone}.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Static operations on {@link Vector3}. Every operation that writes a vector
 * writes into its first argument (`target` or `out`) and returns it, rather
 * than allocating a new `Vector3`. Operations that return a scalar
 * (`magnitude`, `magnitudeSquared`, `dot`, `distance`, `distanceSquared`,
 * `angleBetween`, `equals`), `toString`, `toFloat32Array` and `clone` never
 * mutate their arguments.
 */
export class Vec3 {
  /**
   * A zero vector (0, 0, 0). A fresh vector is created on every access, so
   * it's always safe to mutate.
   */
  static get zero(): Vector3 {
    return { x: 0, y: 0, z: 0 };
  }

  /**
   * A vector with components of 1 (1, 1, 1). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get one(): Vector3 {
    return { x: 1, y: 1, z: 1 };
  }

  /**
   * A unit vector pointing upward (0, 1, 0). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get up(): Vector3 {
    return { x: 0, y: 1, z: 0 };
  }

  /**
   * A unit vector pointing downward (0, -1, 0). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get down(): Vector3 {
    return { x: 0, y: -1, z: 0 };
  }

  /**
   * A unit vector pointing left (-1, 0, 0). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get left(): Vector3 {
    return { x: -1, y: 0, z: 0 };
  }

  /**
   * A unit vector pointing right (1, 0, 0). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get right(): Vector3 {
    return { x: 1, y: 0, z: 0 };
  }

  /**
   * A unit vector pointing forward (0, 0, -1), the direction cameras, lights
   * and anything that aims look along. A fresh vector is created on every
   * access, so it's always safe to mutate.
   */
  static get forward(): Vector3 {
    return { x: 0, y: 0, z: -1 };
  }

  /**
   * A unit vector pointing backward (0, 0, 1), towards the viewer. A fresh
   * vector is created on every access, so it's always safe to mutate.
   */
  static get backward(): Vector3 {
    return { x: 0, y: 0, z: 1 };
  }

  /**
   * The direction a model's front faces (0, 0, 1), as glTF specifies, so a
   * model faces a camera that looks along {@link Vec3.forward}. A fresh
   * vector is created on every access, so it's always safe to mutate.
   */
  static get modelFront(): Vector3 {
    return { x: 0, y: 0, z: 1 };
  }

  /**
   * Sets a vector's components to match another vector, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to copy components from.
   * @returns `target`, for chaining.
   */
  public static set(target: Vector3, value: Vector3): Vector3 {
    target.x = value.x;
    target.y = value.y;
    target.z = value.z;

    return target;
  }

  /**
   * Sets a vector's components, mutating it in place.
   * @param target - The vector to mutate.
   * @param x - The new x component.
   * @param y - The new y component.
   * @param z - The new z component.
   * @returns `target`, for chaining.
   */
  public static setComponents(
    target: Vector3,
    x: number,
    y: number,
    z: number,
  ): Vector3 {
    target.x = x;
    target.y = y;
    target.z = z;

    return target;
  }

  /**
   * Sets `out` to a 2D vector's `x` and `y` with the given `z`.
   * @param out - The vector to write.
   * @param vector - The 2D vector to read `x` and `y` from.
   * @param z - The z component.
   * @returns `out`, for chaining.
   */
  public static fromVector2(out: Vector3, vector: Vector2, z: number): Vector3 {
    out.x = vector.x;
    out.y = vector.y;
    out.z = z;

    return out;
  }

  /**
   * Adds another vector into `target`, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to add.
   * @returns `target`, for chaining.
   */
  public static add(target: Vector3, value: Vector3): Vector3 {
    target.x += value.x;
    target.y += value.y;
    target.z += value.z;

    return target;
  }

  /**
   * Subtracts another vector from `target`, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to subtract.
   * @returns `target`, for chaining.
   */
  public static subtract(target: Vector3, value: Vector3): Vector3 {
    target.x -= value.x;
    target.y -= value.y;
    target.z -= value.z;

    return target;
  }

  /**
   * Multiplies `target` by a scalar value, mutating it in place.
   * @param target - The vector to mutate.
   * @param scalar - The scalar value to multiply by.
   * @returns `target`, for chaining.
   */
  public static multiply(target: Vector3, scalar: number): Vector3 {
    target.x *= scalar;
    target.y *= scalar;
    target.z *= scalar;

    return target;
  }

  /**
   * Multiplies `target`'s components by another vector's components, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to multiply components with.
   * @returns `target`, for chaining.
   */
  public static multiplyComponents(target: Vector3, value: Vector3): Vector3 {
    target.x *= value.x;
    target.y *= value.y;
    target.z *= value.z;

    return target;
  }

  /**
   * Divides `target` by a scalar value, mutating it in place.
   * @param target - The vector to mutate.
   * @param scalar - The scalar value to divide by.
   * @returns `target`, for chaining.
   */
  public static divide(target: Vector3, scalar: number): Vector3 {
    target.x /= scalar;
    target.y /= scalar;
    target.z /= scalar;

    return target;
  }

  /**
   * Calculates the squared magnitude of a vector.
   * This is faster than {@link Vec3.magnitude} as it avoids the square root.
   * @param vector - The vector.
   * @returns The squared magnitude of the vector.
   */
  public static magnitudeSquared(vector: Vector3): number {
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
  }

  /**
   * Calculates the magnitude (length) of a vector.
   * @param vector - The vector.
   * @returns The magnitude of the vector.
   */
  public static magnitude(vector: Vector3): number {
    return Math.sqrt(Vec3.magnitudeSquared(vector));
  }

  /**
   * Normalizes `target` to unit length in the same direction, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   * @throws An error if `target` has zero length, since its direction is undefined.
   */
  public static normalize(target: Vector3): Vector3 {
    const length = Vec3.magnitude(target);

    if (length === 0) {
      throw new Error('Unable to normalize a zero-length Vector3.');
    }

    return Vec3.divide(target, length);
  }

  /**
   * Rounds `target`'s components down to the nearest integer, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static floorComponents(target: Vector3): Vector3 {
    target.x = Math.floor(target.x);
    target.y = Math.floor(target.y);
    target.z = Math.floor(target.z);

    return target;
  }

  /**
   * Creates a deep copy of a vector.
   * @param vector - The vector to copy.
   * @returns A new Vector3 with the same component values.
   */
  public static clone(vector: Vector3): Vector3 {
    return { x: vector.x, y: vector.y, z: vector.z };
  }

  /**
   * Returns a string representation of a vector.
   * @param vector - The vector.
   * @returns A string in the format "(x, y, z)" with components rounded to 1 decimal place.
   */
  public static toString(vector: Vector3): string {
    return `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}, ${vector.z.toFixed(1)})`;
  }

  /**
   * Checks if two vectors are equal.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors have the same components, false otherwise.
   */
  public static equals(a: Vector3, b: Vector3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }

  /**
   * Converts a vector to a glsl-compatible float32 array.
   * @param vector - The vector.
   * @returns The 3d vector array (e.g. `[5, 3, 8]` for `{ x: 5, y: 3, z: 8 }`).
   */
  public static toFloat32Array(vector: Vector3): Float32Array {
    return new Float32Array([vector.x, vector.y, vector.z]);
  }

  /**
   * Calculates the dot product of two vectors.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns `a · b`.
   */
  public static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  /**
   * Sets `target` to the cross product `target × value`, mutating it in
   * place. In the right-handed space, `Vec3.cross(Vec3.right, Vec3.up)` is
   * `(0, 0, 1)`.
   * @param target - The vector to mutate, the left operand.
   * @param value - The right operand.
   * @returns `target`, for chaining.
   */
  public static cross(target: Vector3, value: Vector3): Vector3 {
    const { x, y, z } = target;

    target.x = y * value.z - z * value.y;
    target.y = z * value.x - x * value.z;
    target.z = x * value.y - y * value.x;

    return target;
  }

  /**
   * Reverses `target`'s direction, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static negate(target: Vector3): Vector3 {
    target.x = -target.x;
    target.y = -target.y;
    target.z = -target.z;

    return target;
  }

  /**
   * Sets each of `target`'s components to the smaller of it and `value`'s,
   * mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to compare with.
   * @returns `target`, for chaining.
   */
  public static min(target: Vector3, value: Vector3): Vector3 {
    target.x = Math.min(target.x, value.x);
    target.y = Math.min(target.y, value.y);
    target.z = Math.min(target.z, value.z);

    return target;
  }

  /**
   * Sets each of `target`'s components to the larger of it and `value`'s,
   * mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to compare with.
   * @returns `target`, for chaining.
   */
  public static max(target: Vector3, value: Vector3): Vector3 {
    target.x = Math.max(target.x, value.x);
    target.y = Math.max(target.y, value.y);
    target.z = Math.max(target.z, value.z);

    return target;
  }

  /**
   * Sets each of `target`'s components to its absolute value, mutating it in
   * place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static abs(target: Vector3): Vector3 {
    target.x = Math.abs(target.x);
    target.y = Math.abs(target.y);
    target.z = Math.abs(target.z);

    return target;
  }

  /**
   * Adds `value` scaled by `scale` to `target` (`target += value * scale`),
   * mutating it in place, for example a velocity integrated over a time step.
   * @param target - The vector to mutate.
   * @param value - The vector to scale and add.
   * @param scale - The scale applied to `value`.
   * @returns `target`, for chaining.
   */
  public static scaleAndAdd(
    target: Vector3,
    value: Vector3,
    scale: number,
  ): Vector3 {
    target.x += value.x * scale;
    target.y += value.y * scale;
    target.z += value.z * scale;

    return target;
  }

  /**
   * Linearly interpolates `target` towards `value`, mutating it in place.
   * @param target - The vector to mutate, the value at `t = 0`.
   * @param value - The value at `t = 1`.
   * @param t - The interpolation factor. Values outside `0` to `1`
   * extrapolate.
   * @returns `target`, for chaining.
   */
  public static lerp(target: Vector3, value: Vector3, t: number): Vector3 {
    target.x += (value.x - target.x) * t;
    target.y += (value.y - target.y) * t;
    target.z += (value.z - target.z) * t;

    return target;
  }

  /**
   * Calculates the distance between two points.
   * @param a - The first point.
   * @param b - The second point.
   * @returns The distance between `a` and `b`.
   */
  public static distance(a: Vector3, b: Vector3): number {
    return Math.sqrt(Vec3.distanceSquared(a, b));
  }

  /**
   * Calculates the squared distance between two points, without a square
   * root.
   * @param a - The first point.
   * @param b - The second point.
   * @returns The squared distance between `a` and `b`.
   */
  public static distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Transforms a point by a 4x4 matrix with `w = 1`, mutating it in place.
   * The result isn't divided by `w`, so use this for affine matrices (world
   * and view matrices) and {@link Vec3.transformPointProjective} for
   * projections.
   * @param target - The point to transform.
   * @param matrix - The matrix to transform by.
   * @returns `target`, for chaining.
   */
  public static transformPoint(target: Vector3, matrix: Matrix4): Vector3 {
    const { x, y, z } = target;

    target.x = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    target.y = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    target.z = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];

    return target;
  }

  /**
   * Transforms a point by a 4x4 matrix with `w = 1` and divides the result
   * by its `w`, mutating it in place. Use this to move a point to or from
   * clip space with a projection matrix or its inverse.
   * @param target - The point to transform.
   * @param matrix - The matrix to transform by.
   * @returns `target`, for chaining. Its components are infinite or `NaN`
   * when the transformed `w` is `0`.
   */
  public static transformPointProjective(
    target: Vector3,
    matrix: Matrix4,
  ): Vector3 {
    const { x, y, z } = target;
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];

    target.x = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w;
    target.y = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
    target.z =
      (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w;

    return target;
  }

  /**
   * Transforms a direction by a 4x4 matrix with `w = 0`, so the matrix's
   * translation doesn't apply, mutating it in place. The result isn't
   * normalized: a matrix with scale changes its length.
   * @param target - The direction to transform.
   * @param matrix - The matrix to transform by.
   * @returns `target`, for chaining.
   */
  public static transformDirection(target: Vector3, matrix: Matrix4): Vector3 {
    const { x, y, z } = target;

    target.x = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    target.y = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    target.z = matrix[2] * x + matrix[6] * y + matrix[10] * z;

    return target;
  }

  /**
   * Multiplies `target` by a 3x3 matrix (`matrix * target`), mutating it in
   * place.
   * @param target - The vector to transform.
   * @param matrix - The matrix to transform by.
   * @returns `target`, for chaining.
   */
  public static transformByMatrix3(target: Vector3, matrix: Matrix3): Vector3 {
    const { x, y, z } = target;

    target.x = matrix[0] * x + matrix[3] * y + matrix[6] * z;
    target.y = matrix[1] * x + matrix[4] * y + matrix[7] * z;
    target.z = matrix[2] * x + matrix[5] * y + matrix[8] * z;

    return target;
  }

  /**
   * Rotates `target` by a unit quaternion, mutating it in place. This is
   * `q v q*`, computed with two cross products rather than a matrix.
   * @param target - The vector to rotate.
   * @param quaternion - The rotation, a unit quaternion.
   * @returns `target`, for chaining.
   */
  public static rotate(target: Vector3, quaternion: Quaternion): Vector3 {
    const { x, y, z } = target;
    const qx = quaternion.x;
    const qy = quaternion.y;
    const qz = quaternion.z;
    const qw = quaternion.w;
    // t = 2 (q.xyz × v)
    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);

    // v' = v + w t + q.xyz × t
    target.x = x + qw * tx + (qy * tz - qz * ty);
    target.y = y + qw * ty + (qz * tx - qx * tz);
    target.z = z + qw * tz + (qx * ty - qy * tx);

    return target;
  }

  /**
   * Removes the part of `target` along `normal`, leaving its projection onto
   * the plane through the origin with that normal, mutating it in place.
   * @param target - The vector to mutate.
   * @param normal - The plane's normal, unit length.
   * @returns `target`, for chaining.
   */
  public static projectOnPlane(target: Vector3, normal: Vector3): Vector3 {
    return Vec3.scaleAndAdd(target, normal, -Vec3.dot(target, normal));
  }

  /**
   * Reflects `target` off the plane with the given normal, mutating it in
   * place, for example a velocity bouncing off a surface.
   * @param target - The vector to mutate.
   * @param normal - The plane's normal, unit length.
   * @returns `target`, for chaining.
   */
  public static reflect(target: Vector3, normal: Vector3): Vector3 {
    return Vec3.scaleAndAdd(target, normal, -2 * Vec3.dot(target, normal));
  }

  /**
   * Calculates the angle between two vectors, computed as
   * `atan2(|a × b|, a · b)`, which stays accurate for nearly parallel
   * vectors.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns The angle in radians, from `0` to `π`. `0` if either vector is
   * zero.
   */
  public static angleBetween(a: Vector3, b: Vector3): number {
    const crossX = a.y * b.z - a.z * b.y;
    const crossY = a.z * b.x - a.x * b.z;
    const crossZ = a.x * b.y - a.y * b.x;
    const crossLength = Math.sqrt(
      crossX * crossX + crossY * crossY + crossZ * crossZ,
    );

    return Math.atan2(crossLength, Vec3.dot(a, b));
  }
}
