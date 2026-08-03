/**
 * A plain two-dimensional vector with x and y components.
 *
 * All operation functions below mutate their `target` argument in place and
 * return it (for chaining) rather than allocating a new `Vector2`. Callers
 * that need to preserve the original value must clone it first with
 * {@link vector2Clone}.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Creates a new Vector2.
 * @param x - The x-coordinate component (default: 0).
 * @param y - The y-coordinate component (default: 0).
 * @returns The created vector.
 */
export const createVector2 = (x: number = 0, y: number = 0): Vector2 => ({
  x,
  y,
});

/**
 * Creates a zero vector (0, 0).
 * @returns A new Vector2.
 */
export const vector2Zero = (): Vector2 => createVector2(0, 0);

/**
 * Creates a vector with components of 1 (1, 1).
 * @returns A new Vector2.
 */
export const vector2One = (): Vector2 => createVector2(1, 1);

/**
 * Creates a unit vector pointing upward (0, -1).
 * @returns A new Vector2.
 */
export const vector2Up = (): Vector2 => createVector2(0, -1);

/**
 * Creates a unit vector pointing downward (0, 1).
 * @returns A new Vector2.
 */
export const vector2Down = (): Vector2 => createVector2(0, 1);

/**
 * Creates a unit vector pointing left (-1, 0).
 * @returns A new Vector2.
 */
export const vector2Left = (): Vector2 => createVector2(-1, 0);

/**
 * Creates a unit vector pointing right (1, 0).
 * @returns A new Vector2.
 */
export const vector2Right = (): Vector2 => createVector2(1, 0);

/**
 * Sets a vector's components to match another vector, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to copy components from.
 * @returns `target`, for chaining.
 */
export const vector2Set = (target: Vector2, value: Vector2): Vector2 => {
  target.x = value.x;
  target.y = value.y;

  return target;
};

/**
 * Adds another vector into `target`, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to add.
 * @returns `target`, for chaining.
 */
export const vector2Add = (target: Vector2, value: Vector2): Vector2 => {
  target.x += value.x;
  target.y += value.y;

  return target;
};

/**
 * Subtracts another vector from `target`, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to subtract.
 * @returns `target`, for chaining.
 */
export const vector2Subtract = (target: Vector2, value: Vector2): Vector2 => {
  target.x -= value.x;
  target.y -= value.y;

  return target;
};

/**
 * Multiplies `target` by a scalar value, mutating it in place.
 * @param target - The vector to mutate.
 * @param scalar - The scalar value to multiply by.
 * @returns `target`, for chaining.
 */
export const vector2Multiply = (target: Vector2, scalar: number): Vector2 => {
  target.x *= scalar;
  target.y *= scalar;

  return target;
};

/**
 * Multiplies `target`'s components by another vector's components, mutating it in place.
 * @param target - The vector to mutate.
 * @param value - The vector to multiply components with.
 * @returns `target`, for chaining.
 */
export const vector2MultiplyComponents = (
  target: Vector2,
  value: Vector2,
): Vector2 => {
  target.x *= value.x;
  target.y *= value.y;

  return target;
};

/**
 * Divides `target` by a scalar value, mutating it in place.
 * @param target - The vector to mutate.
 * @param scalar - The scalar value to divide by.
 * @returns `target`, for chaining.
 */
export const vector2Divide = (target: Vector2, scalar: number): Vector2 => {
  target.x /= scalar;
  target.y /= scalar;

  return target;
};

/**
 * Calculates the squared magnitude of a vector.
 * This is faster than {@link vector2Magnitude} as it avoids the square root.
 * @param vector - The vector.
 * @returns The squared magnitude of the vector.
 */
export const vector2MagnitudeSquared = (vector: Vector2): number =>
  vector.x * vector.x + vector.y * vector.y;

/**
 * Calculates the magnitude (length) of a vector.
 * @param vector - The vector.
 * @returns The magnitude of the vector.
 */
export const vector2Magnitude = (vector: Vector2): number =>
  Math.sqrt(vector2MagnitudeSquared(vector));

/**
 * Normalizes `target` to unit length in the same direction, mutating it in place.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector2Normalize = (target: Vector2): Vector2 => {
  const length = vector2Magnitude(target);

  if (length === 0) {
    return target;
  }

  return vector2Divide(target, length);
};

/**
 * Rounds `target`'s components down to the nearest integer, mutating it in place.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector2FloorComponents = (target: Vector2): Vector2 => {
  target.x = Math.floor(target.x);
  target.y = Math.floor(target.y);

  return target;
};

/**
 * Creates a deep copy of a vector.
 * @param vector - The vector to copy.
 * @returns A new Vector2 with the same component values.
 */
export const vector2Clone = (vector: Vector2): Vector2 =>
  createVector2(vector.x, vector.y);

/**
 * Returns a string representation of a vector.
 * @param vector - The vector.
 * @returns A string in the format "(x, y)" with components rounded to 1 decimal place.
 */
export const vector2ToString = (vector: Vector2): string =>
  `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)})`;

/**
 * Checks if two vectors are equal.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns True if the vectors have the same components, false otherwise.
 */
export const vector2Equals = (a: Vector2, b: Vector2): boolean =>
  a.x === b.x && a.y === b.y;

/**
 * Converts a vector to a glsl-compatible float32 array.
 * @param vector - The vector.
 * @returns The 2d vector array (e.g. `[5, 3]` for `createVector2(5, 3)`).
 */
export const vector2ToFloat32Array = (vector: Vector2): Float32Array =>
  new Float32Array([vector.x, vector.y]);

/**
 * Calculates the distance between two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The distance between the two vectors.
 */
export const vector2DistanceTo = (a: Vector2, b: Vector2): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Rotates `target` by a given angle in radians, mutating it in place.
 * @param target - The vector to mutate.
 * @param angleInRadians - The angle in radians to rotate the vector.
 * @returns `target`, for chaining.
 */
export const vector2Rotate = (
  target: Vector2,
  angleInRadians: number,
): Vector2 => {
  const cos = Math.cos(angleInRadians);
  const sin = Math.sin(angleInRadians);
  const { x, y } = target;

  target.x = x * cos - y * sin;
  target.y = x * sin + y * cos;

  return target;
};

/**
 * Calculates the dot product of two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The dot product of the two vectors.
 */
export const vector2Dot = (a: Vector2, b: Vector2): number =>
  a.x * b.x + a.y * b.y;

/**
 * Calculates the 2D (scalar) cross product of two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The scalar cross product of the two vectors.
 */
export const vector2Cross = (a: Vector2, b: Vector2): number =>
  a.x * b.y - a.y * b.x;

/**
 * Rotates `target` -90 degrees (y, -x) in place, making it perpendicular to
 * its original direction.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector2Perpendicular = (target: Vector2): Vector2 => {
  const { x, y } = target;

  target.x = y;
  target.y = -x;

  return target;
};

/**
 * Negates both of `target`'s components, mutating it in place.
 * @param target - The vector to mutate.
 * @returns `target`, for chaining.
 */
export const vector2Negate = (target: Vector2): Vector2 => {
  target.x = -target.x;
  target.y = -target.y;

  return target;
};
