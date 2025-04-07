/**
 * Represents a three-dimensional vector with x, y, and z components.
 * Provides methods for common vector operations and transformations.
 */
export class Vector3 {
  /** The x-coordinate component of the vector */
  public x: number;

  /** The y-coordinate component of the vector */
  public y: number;

  /** The z-coordinate component of the vector */
  public z: number;

  /**
   * Creates a new Vector3.
   * @param x - The x-coordinate component (default: 0)
   * @param y - The y-coordinate component (default: 0)
   * @param z - The z-coordinate component (default: 0)
   */
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Sets this vector's components to match another vector.
   * @param value - The vector to copy components from
   * @returns This vector for chaining
   */
  public set(value: Vector3): this {
    this.x = value.x;
    this.y = value.y;
    this.z = value.z;

    return this;
  }

  /**
   * Returns a new vector that is the sum of this vector and another vector.
   * @param value - The vector to add
   * @returns A new Vector3 representing the sum
   */
  public add(value: Vector3): Vector3 {
    const x = this.x + value.x;
    const y = this.y + value.y;
    const z = this.z + value.z;

    return new Vector3(x, y, z);
  }

  /**
   * Returns a new vector that is the difference between this vector and another vector.
   * @param value - The vector to subtract
   * @returns A new Vector3 representing the difference
   */
  public subtract(value: Vector3): Vector3 {
    const x = this.x - value.x;
    const y = this.y - value.y;
    const z = this.z - value.z;

    return new Vector3(x, y, z);
  }

  /**
   * Multiplies this vector by a scalar value.
   * @param scalar - The scalar value to multiply by
   * @returns A new Vector3 scaled by the input value
   */
  public multiply(scalar: number): Vector3 {
    const x = this.x * scalar;
    const y = this.y * scalar;
    const z = this.z * scalar;

    return new Vector3(x, y, z);
  }

  /**
   * Multiplies this vector's components by another vector's components.
   * @param vector - The vector to multiply components with
   * @returns A new Vector3 with multiplied components
   */
  public multiplyComponents(vector: Vector3): Vector3 {
    const x = this.x * vector.x;
    const y = this.y * vector.y;
    const z = this.z * vector.z;

    return new Vector3(x, y, z);
  }

  /**
   * Divides this vector by a scalar value.
   * @param scalar - The scalar value to divide by
   * @returns A new Vector3 divided by the scalar
   */
  public divide(scalar: number): Vector3 {
    const x = this.x / scalar;
    const y = this.y / scalar;
    const z = this.z / scalar;

    return new Vector3(x, y, z);
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
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Returns a normalized (unit length) version of this vector.
   * @returns A new Vector3 with magnitude 1 in the same direction
   */
  public normalize(): Vector3 {
    const length = this.magnitude();

    if (length === 0) return this;

    return this.divide(length);
  }

  /**
   * Returns a new vector with components rounded down to the nearest integer.
   * @returns A new Vector3 with floored components
   */
  public floorComponents(): Vector3 {
    return new Vector3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
  }

  /**
   * Creates a deep copy of this vector.
   * @returns A new Vector3 with the same component values
   */
  public clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Returns a string representation of this vector.
   * @returns A string in the format "(x, y, z)" with components rounded to 1 decimal place
   */
  public toString(): string {
    return `(${this.x.toFixed(1)}, ${this.y.toFixed(1)}, ${this.z.toFixed(1)})`;
  }

  /**
   * Checks if this vector is equal to another vector.
   * @param value - The vector to compare
   * @returns True if the vectors have the same components, false otherwise
   */
  public equals(value: Vector3): boolean {
    return this.x === value.x && this.y === value.y && this.z === value.z;
  }

  /**
   * Returns a zero vector (0, 0, 0).
   */
  static get zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  /**
   * Returns a vector with components of 1 (1, 1, 1).
   */
  static get one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  /**
   * Returns a unit vector pointing upward (0, 1, 0).
   */
  static get up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  /**
   * Returns a unit vector pointing downward (0, -1, 0).
   */
  static get down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  /**
   * Returns a unit vector pointing left (-1, 0, 0).
   */
  static get left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }

  /**
   * Returns a unit vector pointing right (1, 0, 0).
   */
  static get right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  /**
   * Returns a unit vector pointing forward (0, 0, 1).
   */
  static get forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  /**
   * Returns a unit vector pointing backward (0, 0, -1).
   */
  static get backward(): Vector3 {
    return new Vector3(0, 0, -1);
  }
}