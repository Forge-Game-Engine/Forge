import { Vector2 } from './vector2.js';

/**
 * Converts a 2D vector to an angle in radians. Angle `0` points along `+X`,
 * and a positive angle turns towards `+Y` (counter-clockwise, since the
 * world is Y-up). This is the inverse of `radiansToVector`.
 *
 * @param vector - The 2D vector to convert.
 * @returns The angle in radians, in `(-π, π]`.
 */
export const vectorToRadians = (vector: Vector2): number => {
  return Math.atan2(vector.y, vector.x);
};
