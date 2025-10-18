import { Vector2 } from 'forge/math';

/**
 * Converts a position from screen space to world space.
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
  // Calculate the screen center in screen space
  const screenCenter = new Vector2(screenWidth / 2, screenHeight / 2);

  // Convert screen position to world space
  return screenPosition
    .subtract(screenCenter) // Shift origin to the center of the screen
    .divide(cameraZoom) // Scale by the camera zoom level
    .add(cameraPosition); // Offset by the camera's position in world space
}
