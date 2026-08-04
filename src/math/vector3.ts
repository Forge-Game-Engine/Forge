/**
 * A plain three-dimensional vector with x, y, and z components.
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
 * Static operations on {@link Vector3}. Mutating operations (`set`, `add`,
 * `subtract`, `multiply`, `multiplyComponents`, `divide`, `normalize`,
 * `floorComponents`) mutate their `target` argument in place and return it,
 * rather than allocating a new `Vector3`. Read-only operations (`magnitude`,
 * `magnitudeSquared`, `equals`, `toString`, `toFloat32Array`) and `clone`
 * never mutate their arguments.
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
   * A unit vector pointing forward (0, 0, 1). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get forward(): Vector3 {
    return { x: 0, y: 0, z: 1 };
  }

  /**
   * A unit vector pointing backward (0, 0, -1). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get backward(): Vector3 {
    return { x: 0, y: 0, z: -1 };
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
}
