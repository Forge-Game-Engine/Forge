import { Vector2 } from 'forge/math';

/**
 * Converts a position from world space to screen space.
 *
 * @param worldPosition - The position in world space.
 * @param cameraPosition - The position of the camera in world space.
 * @param cameraZoom - The zoom level of the camera.
 * @param canvasCenter - The center of the canvas.
 * @returns The position in screen space.
 */
export const worldToScreenSpace = (
  worldPosition: Vector2,
  cameraPosition: Vector2,
  cameraZoom: number,
  canvasCenter: Vector2,
): Vector2 => {
  const relativePosition = worldPosition.subtract(cameraPosition);
  const zoomedPosition = relativePosition.multiply(cameraZoom);
  const screenPosition = zoomedPosition.add(canvasCenter);

  return screenPosition;
};
