/**
 * A plain two-dimensional vector with x and y components.
 *
 * All mutating operations on {@link Vec2} mutate their `target` argument in
 * place and return it (for chaining) rather than allocating a new `Vector2`.
 * Callers that need to preserve the original value must clone it first with
 * {@link Vec2.clone}.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Static operations on {@link Vector2}. Mutating operations (`set`, `add`,
 * `subtract`, `multiply`, `multiplyComponents`, `divide`, `normalize`,
 * `floorComponents`, `rotate`, `perpendicular`, `negate`) mutate their
 * `target` argument in place and return it, rather than allocating a new
 * `Vector2`. Read-only operations (`magnitude`, `magnitudeSquared`, `dot`,
 * `cross`, `distanceTo`, `equals`, `toString`, `toFloat32Array`) and `clone`
 * never mutate their arguments.
 */
export class Vec2 {
  /**
   * Creates a new Vector2.
   * @param x - The x-coordinate component (default: 0).
   * @param y - The y-coordinate component (default: 0).
   * @returns The created vector.
   */
  public static create(x: number = 0, y: number = 0): Vector2 {
    return { x, y };
  }

  /**
   * A zero vector (0, 0). A fresh vector is created on every access, so it's
   * always safe to mutate.
   */
  static get zero(): Vector2 {
    return Vec2.create(0, 0);
  }

  /**
   * A vector with components of 1 (1, 1). A fresh vector is created on every
   * access, so it's always safe to mutate.
   */
  static get one(): Vector2 {
    return Vec2.create(1, 1);
  }

  /**
   * A unit vector pointing upward (0, -1). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get up(): Vector2 {
    return Vec2.create(0, -1);
  }

  /**
   * A unit vector pointing downward (0, 1). A fresh vector is created on
   * every access, so it's always safe to mutate.
   */
  static get down(): Vector2 {
    return Vec2.create(0, 1);
  }

  /**
   * A unit vector pointing left (-1, 0). A fresh vector is created on every
   * access, so it's always safe to mutate.
   */
  static get left(): Vector2 {
    return Vec2.create(-1, 0);
  }

  /**
   * A unit vector pointing right (1, 0). A fresh vector is created on every
   * access, so it's always safe to mutate.
   */
  static get right(): Vector2 {
    return Vec2.create(1, 0);
  }

  /**
   * Sets a vector's components to match another vector, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to copy components from.
   * @returns `target`, for chaining.
   */
  public static set(target: Vector2, value: Vector2): Vector2 {
    target.x = value.x;
    target.y = value.y;

    return target;
  }

  /**
   * Adds another vector into `target`, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to add.
   * @returns `target`, for chaining.
   */
  public static add(target: Vector2, value: Vector2): Vector2 {
    target.x += value.x;
    target.y += value.y;

    return target;
  }

  /**
   * Subtracts another vector from `target`, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to subtract.
   * @returns `target`, for chaining.
   */
  public static subtract(target: Vector2, value: Vector2): Vector2 {
    target.x -= value.x;
    target.y -= value.y;

    return target;
  }

  /**
   * Multiplies `target` by a scalar value, mutating it in place.
   * @param target - The vector to mutate.
   * @param scalar - The scalar value to multiply by.
   * @returns `target`, for chaining.
   */
  public static multiply(target: Vector2, scalar: number): Vector2 {
    target.x *= scalar;
    target.y *= scalar;

    return target;
  }

  /**
   * Multiplies `target`'s components by another vector's components, mutating it in place.
   * @param target - The vector to mutate.
   * @param value - The vector to multiply components with.
   * @returns `target`, for chaining.
   */
  public static multiplyComponents(target: Vector2, value: Vector2): Vector2 {
    target.x *= value.x;
    target.y *= value.y;

    return target;
  }

  /**
   * Divides `target` by a scalar value, mutating it in place.
   * @param target - The vector to mutate.
   * @param scalar - The scalar value to divide by.
   * @returns `target`, for chaining.
   */
  public static divide(target: Vector2, scalar: number): Vector2 {
    target.x /= scalar;
    target.y /= scalar;

    return target;
  }

  /**
   * Calculates the squared magnitude of a vector.
   * This is faster than {@link Vec2.magnitude} as it avoids the square root.
   * @param vector - The vector.
   * @returns The squared magnitude of the vector.
   */
  public static magnitudeSquared(vector: Vector2): number {
    return vector.x * vector.x + vector.y * vector.y;
  }

  /**
   * Calculates the magnitude (length) of a vector.
   * @param vector - The vector.
   * @returns The magnitude of the vector.
   */
  public static magnitude(vector: Vector2): number {
    return Math.sqrt(Vec2.magnitudeSquared(vector));
  }

  /**
   * Normalizes `target` to unit length in the same direction, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   * @throws An error if `target` has zero length, since its direction is undefined.
   */
  public static normalize(target: Vector2): Vector2 {
    const length = Vec2.magnitude(target);

    if (length === 0) {
      throw new Error('Unable to normalize a zero-length Vector2.');
    }

    return Vec2.divide(target, length);
  }

  /**
   * Rounds `target`'s components down to the nearest integer, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static floorComponents(target: Vector2): Vector2 {
    target.x = Math.floor(target.x);
    target.y = Math.floor(target.y);

    return target;
  }

  /**
   * Creates a deep copy of a vector.
   * @param vector - The vector to copy.
   * @returns A new Vector2 with the same component values.
   */
  public static clone(vector: Vector2): Vector2 {
    return Vec2.create(vector.x, vector.y);
  }

  /**
   * Returns a string representation of a vector.
   * @param vector - The vector.
   * @returns A string in the format "(x, y)" with components rounded to 1 decimal place.
   */
  public static toString(vector: Vector2): string {
    return `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)})`;
  }

  /**
   * Checks if two vectors are equal.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors have the same components, false otherwise.
   */
  public static equals(a: Vector2, b: Vector2): boolean {
    return a.x === b.x && a.y === b.y;
  }

  /**
   * Converts a vector to a glsl-compatible float32 array.
   * @param vector - The vector.
   * @returns The 2d vector array (e.g. `[5, 3]` for `Vec2.create(5, 3)`).
   */
  public static toFloat32Array(vector: Vector2): Float32Array {
    return new Float32Array([vector.x, vector.y]);
  }

  /**
   * Calculates the distance between two vectors.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns The distance between the two vectors.
   */
  public static distanceTo(a: Vector2, b: Vector2): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  /**
   * Rotates `target` by a given angle in radians, mutating it in place.
   * @param target - The vector to mutate.
   * @param angleInRadians - The angle in radians to rotate the vector.
   * @returns `target`, for chaining.
   */
  public static rotate(target: Vector2, angleInRadians: number): Vector2 {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);
    const { x, y } = target;

    target.x = x * cos - y * sin;
    target.y = x * sin + y * cos;

    return target;
  }

  /**
   * Calculates the dot product of two vectors.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns The dot product of the two vectors.
   */
  public static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  /**
   * Calculates the 2D (scalar) cross product of two vectors.
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns The scalar cross product of the two vectors.
   */
  public static cross(a: Vector2, b: Vector2): number {
    return a.x * b.y - a.y * b.x;
  }

  /**
   * Rotates `target` -90 degrees (y, -x) in place, making it perpendicular to
   * its original direction.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static perpendicular(target: Vector2): Vector2 {
    const { x, y } = target;

    target.x = y;
    target.y = -x;

    return target;
  }

  /**
   * Negates both of `target`'s components, mutating it in place.
   * @param target - The vector to mutate.
   * @returns `target`, for chaining.
   */
  public static negate(target: Vector2): Vector2 {
    target.x = -target.x;
    target.y = -target.y;

    return target;
  }
}
