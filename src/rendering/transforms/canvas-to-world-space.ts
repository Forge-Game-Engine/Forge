import { Vector2 } from '../../math/index.js';

/**
 * Converts a position from canvas space to world space.
 *
 * @param canvasPosition - The position in canvas space.
 * @param worldCenter - The center of the world space.
 * @returns The position in world space.
 */
export const canvasToWorldSpace = (
  canvasPosition: Vector2,
  worldCenter: Vector2,
): Vector2 => canvasPosition.add(worldCenter);
