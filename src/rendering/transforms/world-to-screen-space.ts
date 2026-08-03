import {
  Vector2,
  vector2Add,
  vector2Clone,
  vector2Multiply,
  vector2Subtract,
} from '../../math/index.js';

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
  const relativePosition = vector2Subtract(
    vector2Clone(worldPosition),
    cameraPosition,
  );
  const zoomedPosition = vector2Multiply(
    relativePosition,
    cameraZoom * pixelsPerUnit,
  );
  const screenPosition = vector2Add(zoomedPosition, canvasCenter);

  return screenPosition;
};
