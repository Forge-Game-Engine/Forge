import { Vector2 } from './vector2.js';

/**
 * Converts a 2D vector to an angle in radians.
 *
 * @param vector - The 2D vector to convert.
 * @returns The angle in radians.
 */
export const vectorToRadians = (vector: Vector2): number => {
  return Math.atan2(vector.y, vector.x);
};
