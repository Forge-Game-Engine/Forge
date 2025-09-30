/**
 * Represents a two-dimensional vector with x and y components.
 * Provides methods for common vector operations and transformations.
 */
export class Vector2 {
  /** The x-coordinate component of the vector */
  public x: number;

  /** The y-coordinate component of the vector */
  public y: number;

  /**
   * Creates a new Vector2.
   * @param x - The x-coordinate component (default: 0)
   * @param y - The y-coordinate component (default: 0)
   */
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets this vector's components to match another vector.
   * @param value - The vector to copy components from
   * @returns This vector for chaining
   */
  public set(value: Vector2) {
    this.x = value.x;
    this.y = value.y;

    return this;
  }

  /**
   * Returns a new vector that is the sum of this vector and another vector.
   * @param value - The vector to add
   * @returns A new Vector2 representing the sum
   */
  public add(value: Vector2): Vector2 {
    const x = this.x + value.x;
    const y = this.y + value.y;

    return new Vector2(x, y);
  }

  /**
   * Returns a new vector that is the difference between this vector and another vector.
   * @param value - The vector to subtract
   * @returns A new Vector2 representing the difference
   */
  public subtract(value: Vector2): Vector2 {
    const x = this.x - value.x;
    const y = this.y - value.y;

    return new Vector2(x, y);
  }

  /**
   * Multiplies this vector by a scalar value.
   * @param scalar - The scalar value to multiply by
   * @returns A new Vector2 scaled by the input value
   */
  public multiply(scalar: number): Vector2 {
    const x = this.x * scalar;
    const y = this.y * scalar;

    return new Vector2(x, y);
  }

  /**
   * Multiplies this vector's components by another vector's components.
   * @param vector - The vector to multiply components with
   * @returns A new Vector2 with multiplied components
   */
  public multiplyComponents(vector: Vector2): Vector2 {
    const x = this.x * vector.x;
    const y = this.y * vector.y;

    return new Vector2(x, y);
  }

  /**
   * Divides this vector by a scalar value.
   * @param scalar - The scalar value to divide by
   * @returns A new Vector2 divided by the scalar
   */
  public divide(scalar: number): Vector2 {
    const x = this.x / scalar;
    const y = this.y / scalar;

    return new Vector2(x, y);
  }

  /**
   * Returns a unit vector pointing upward (0, -1).
   */
  static get up(): Vector2 {
    return new Vector2(0, -1);
  }

  /**
   * Returns a unit vector pointing downward (0, 1).
   */
  static get down(): Vector2 {
    return new Vector2(0, 1);
  }

  /**
   * Returns a unit vector pointing left (-1, 0).
   */
  static get left(): Vector2 {
    return new Vector2(-1, 0);
  }

  /**
   * Returns a unit vector pointing right (1, 0).
   */
  static get right(): Vector2 {
    return new Vector2(1, 0);
  }

  /**
   * Returns a zero vector (0, 0).
   */
  static get zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /**
   * Returns a vector with components of 1 (1, 1).
   */
  static get one(): Vector2 {
    return new Vector2(1, 1);
  }

  /**
   * Calculates the magnitude (length) of this vector.
   * @returns The magnitude of the vector
   */
  public magnitude(): number {
    return Math.sqrt(this.magnitudeSquared());
  }

  /**
   * Calculates the squared magnitude of this vector.
   * This is faster than magnitude() as it avoids the square root.
   * @returns The squared magnitude of the vector
   */
  public magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Returns a normalized (unit length) version of this vector.
   * @returns A new Vector2 with magnitude 1 in the same direction
   */
  public normalize(): Vector2 {
    const length = this.magnitude();

    if (length === 0) {
      return this;
    }

    return this.divide(length);
  }

  /**
   * Returns a new vector with components rounded down to the nearest integer.
   * @returns A new Vector2 with floored components
   */
  public floorComponents(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  /**
   * Creates a deep copy of this vector.
   * @returns A new Vector2 with the same component values
   */
  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * Returns a string representation of this vector.
   * @returns A string in the format "(x, y)" with components rounded to 1 decimal place
   */
  public toString(): string {
    return `(${this.x.toFixed(1)}, ${this.y.toFixed(1)})`;
  }

  /**
   * Checks if this vector is equal to another vector.
   * @param value - The vector to compare
   * @returns True if the vectors have the same components, false otherwise
   */
  public equals(value: Vector2): boolean {
    return this.x === value.x && this.y === value.y;
  }

  /**
   * Converts the 2d vector to a glsl-compatible float32 array.
   * @returns The 2d vector array (e.g. `[5, 3]` for a `new Vector2(5, 3)`).
   */
  public toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y]);
  }

  /**
   * Calculates the distance between this vector and another vector.
   * @param other - The other vector
   * @returns The distance between the two vectors
   */
  public distanceTo(other: Vector2): number {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  /**
   * rotates this vector by a given angle in radians.
   * @param angleInRadians - The angle in radians to rotate the vector
   * @returns A new Vector2 representing the rotated vector
   */
  public rotate(angleInRadians: number): Vector2 {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);

    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }
}
