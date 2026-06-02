import { Vector2 } from './vector2.js';

/**
 * Scales a point relative to a pivot point by a given scale factor.
 *
 * @param point - The point to scale.
 * @param pivot - The pivot point to scale relative to.
 * @param scale - The scale factor as a Vector2.
 * @returns A new Vector2 representing the scaled point.
 */
export const scaleRelativeToPoint = (
  point: Vector2,
  pivot: Vector2,
  scale: Vector2,
): Vector2 => {
  const xScaled = scale.x * (point.x - pivot.x) + pivot.x;
  const yScaled = scale.y * (point.y - pivot.y) + pivot.y;

  return new Vector2(xScaled, yScaled);
};
