/**
 * A plain three-dimensional vector with x, y, and z components.
 *
 * All operation functions below mutate their `target` argument in place and
 * return it (for chaining) rather than allocating a new `Vector3`. Callers
 * that need to preserve the original value must clone it first with
 * {@link vector3Clone}.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Creates a new Vector3.
 * @param x - The x-coordinate component (default: 0).
 * @param y - The y-coordinate component (default: 0).
 * @param z - The z-coordinate component (default: 0).
 * @returns The created vector.
 */
export const createVector3 = (
  x: number = 0,
  y: number = 0,
  z: number = 0,
): Vector3 => ({ x, y, z });

/**
 * Creates a zero vector (0, 0, 0).
 * @returns A new Vector3.
 */
export const vector3Zero = (): Vector3 => createVector3(0, 0, 0);

/**
 * Creates a vector with components of 1 (1, 1, 1).
 * @returns A new Vector3.
 */
export const vector3One = (): Vector3 => createVector3(1, 1, 1);

/**
 * Creates a unit vector pointing upward (0, 1, 0).
 * @returns A new Vector3.
 */
export const vector3Up = (): Vector3 => createVector3(0, 1, 0);

/**
 * Creates a unit vector pointing downward (0, -1, 0).
 * @returns A new Vector3.
 */
export const vector3Down = (): Vector3 => createVector3(0, -1, 0);

/**
 * Creates a unit vector pointing left (-1, 0, 0).
 * @returns A new Vector3.
 */
export const vector3Left = (): Vector3 => createVector3(-1, 0, 0);

/**
 * Creates a unit vector pointing right (1, 0, 0).
 * @returns A new Vector3.
 */
export const vector3Right = (): Vector3 => createVector3(1, 0, 0);

/**
 * Creates a unit vector pointing forward (0, 0, 1).
 * @returns A new Vector3.
 */
export const vector3Forward = (): Vector3 => createVector3(0, 0, 1);

/**
 * Creates a unit vector pointing backward (0, 0, -1).
 * @returns A new Vector3.
 */
export const vector3Backward = (): Vector3 => createVector3(0, 0, -1);

/**
 * Sets a vector's components to match another vector, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to copy components from.
 * @returns `target`, for chaining.
 */
export const vector3Set = (target: Vector3, value: Vector3): Vector3 => {
  target.x = value.x;
  target.y = value.y;
  target.z = value.z;

  return target;
};

/**
 * Adds another vector into `target`, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to add.
 * @returns `target`, for chaining.
 */
export const vector3Add = (target: Vector3, value: Vector3): Vector3 => {
  target.x += value.x;
  target.y += value.y;
  target.z += value.z;

  return target;
};

/**
 * Subtracts another vector from `target`, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to subtract.
 * @returns `target`, for chaining.
 */
export const vector3Subtract = (target: Vector3, value: Vector3): Vector3 => {
  target.x -= value.x;
  target.y -= value.y;
  target.z -= value.z;

  return target;
};

/**
 * Multiplies `target` by a scalar value, mutating it in place.
 * @param target - The vector to mutate.
 * @param scalar - The scalar value to multiply by.
 * @returns `target`, for chaining.
 */
export const vector3Multiply = (target: Vector3, scalar: number): Vector3 => {
  target.x *= scalar;
  target.y *= scalar;
  target.z *= scalar;

  return target;
};

/**
 * Multiplies `target`'s components by another vector's components, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to multiply components with.
 * @returns `target`, for chaining.
 */
export const vector3MultiplyComponents = (
  target: Vector3,
  value: Vector3,
): Vector3 => {
  target.x *= value.x;
  target.y *= value.y;
  target.z *= value.z;

  return target;
};

/**
 * Divides `target` by a scalar value, mutating it in place.
 * @param target - The vector to mutate.
 * @param scalar - The scalar value to divide by.
 * @returns `target`, for chaining.
 */
export const vector3Divide = (target: Vector3, scalar: number): Vector3 => {
  target.x /= scalar;
  target.y /= scalar;
  target.z /= scalar;

  return target;
};

/**
 * Calculates the squared magnitude of a vector.
 * This is faster than {@link vector3Magnitude} as it avoids the square root.
 * @param vector - The vector.
 * @returns The squared magnitude of the vector.
 */
export const vector3MagnitudeSquared = (vector: Vector3): number =>
  vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;

/**
 * Calculates the magnitude (length) of a vector.
 * @param vector - The vector.
 * @returns The magnitude of the vector.
 */
export const vector3Magnitude = (vector: Vector3): number =>
  Math.sqrt(vector3MagnitudeSquared(vector));

/**
 * Normalizes `target` to unit length in the same direction, mutating it in place.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector3Normalize = (target: Vector3): Vector3 => {
  const length = vector3Magnitude(target);

  if (length === 0) {
    return target;
  }

  return vector3Divide(target, length);
};

/**
 * Rounds `target`'s components down to the nearest integer, mutating it in place.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector3FloorComponents = (target: Vector3): Vector3 => {
  target.x = Math.floor(target.x);
  target.y = Math.floor(target.y);
  target.z = Math.floor(target.z);

  return target;
};

/**
 * Creates a deep copy of a vector.
 * @param vector - The vector to copy.
 * @returns A new Vector3 with the same component values.
 */
export const vector3Clone = (vector: Vector3): Vector3 =>
  createVector3(vector.x, vector.y, vector.z);

/**
 * Returns a string representation of a vector.
 * @param vector - The vector.
 * @returns A string in the format "(x, y, z)" with components rounded to 1 decimal place.
 */
export const vector3ToString = (vector: Vector3): string =>
  `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}, ${vector.z.toFixed(1)})`;

/**
 * Checks if two vectors are equal.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns True if the vectors have the same components, false otherwise.
 */
export const vector3Equals = (a: Vector3, b: Vector3): boolean =>
  a.x === b.x && a.y === b.y && a.z === b.z;

/**
 * Converts a vector to a glsl-compatible float32 array.
 * @param vector - The vector.
 * @returns The 3d vector array (e.g. `[5, 3, 8]` for `createVector3(5, 3, 8)`).
 */
export const vector3ToFloat32Array = (vector: Vector3): Float32Array =>
  new Float32Array([vector.x, vector.y, vector.z]);
