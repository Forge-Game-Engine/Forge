import { Vec2, Vector2 } from '../../math/index.js';

/**
 * Converts a position from world space to screen space.
 *
 * @param worldPosition - The position in world space.
 * @param cameraPosition - The position of the camera in world space.
 * @param cameraZoom - The zoom level of the camera.
 * @param canvasCenter - The center of the canvas.
 * @param pixelsPerUnit - The number of pixels one world unit occupies (see
 * `calculatePixelsPerUnit`). Defaults to `1`.
 * @returns The position in screen space.
 */
export const worldToScreenSpace = (
  worldPosition: Vector2,
  cameraPosition: Vector2,
  cameraZoom: number,
  canvasCenter: Vector2,
  pixelsPerUnit: number = 1,
): Vector2 => {
  // Clone before subtracting: `worldPosition` is a caller-supplied vector
  // (e.g. an entity's live world position), so this must not mutate it.
  const relativePosition = Vec2.subtract(
    Vec2.clone(worldPosition),
    cameraPosition,
  );
  const zoomedPosition = Vec2.multiply(
    relativePosition,
    cameraZoom * pixelsPerUnit,
  );
  const screenPosition = Vec2.add(zoomedPosition, canvasCenter);

  return screenPosition;
};
