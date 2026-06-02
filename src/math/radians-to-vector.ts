import { Vector2 } from './vector2.js';

/**
 * Converts an angle in radians to a 2D vector.
 *
 * @param radians - The angle in radians to convert.
 * @returns The corresponding 2D vector. (magnitude is 1)
 */
export function radiansToVector(radians: number): Vector2 {
  return new Vector2(Math.sin(radians), -Math.cos(radians));
}
