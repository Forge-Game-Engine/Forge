import { Vector2 } from '../../math/index.js';

/**
 * Converts a position from screen space to world space.
 *
 * Forge uses a Y-up world coordinate system (positive Y points upward), while
 * the canvas uses a Y-down screen coordinate system (positive Y points downward).
 * The rendering projection matrix applies a negative Y scale (`-2 / height`) to
 * account for this, so this function must flip Y when converting screen → world.
 *
 * @param screenPosition - The position in screen space (e.g., mouse position relative to the viewport).
 * @param cameraPosition - The position of the camera in world space.
 * @param cameraZoom - The zoom level of the camera.
 * @param screenWidth - The width of the screen in pixels.
 * @param screenHeight - The height of the screen in pixels.
 * @returns The position in world space.
 */
export function screenToWorldSpace(
  screenPosition: Vector2,
  cameraPosition: Vector2,
  cameraZoom: number,
  screenWidth: number,
  screenHeight: number,
): Vector2 {
  // Shift origin to the center of the screen, flip Y to convert from
  // Y-down screen space to Y-up world space, then scale and offset.
  const worldX =
    (screenPosition.x - screenWidth / 2) / cameraZoom + cameraPosition.x;
  const worldY =
    (screenHeight / 2 - screenPosition.y) / cameraZoom + cameraPosition.y;

  return new Vector2(worldX, worldY);
}
