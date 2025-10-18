import { Matrix3x3, Vector2 } from 'forge/math';

/**
 * Creates a projection matrix for rendering with a camera.
 * The projection matrix is centered on the camera position and applies zoom.
 *
 * @param width - The width of the viewport.
 * @param height - The height of the viewport.
 * @param cameraPosition - The position of the camera in world coordinates.
 * @param zoom - The zoom level to apply to the projection.
 * @returns A 3x3 projection matrix that can be used for rendering.
 */
export function createProjectionMatrix(
  width: number,
  height: number,
  cameraPosition: Vector2,
  zoom: number,
): Matrix3x3 {
  const projectionMatrix = Matrix3x3.identity;

  // Centered projection: (0,0) is center of screen
  projectionMatrix.scale(2 / width, -2 / height); // Y+ is up, -h/2..h/2 maps to -1..1
  // No translate(-1, 1)

  // Apply zoom around the center
  projectionMatrix.scale(zoom, zoom);

  // Center cameraPos on screen
  projectionMatrix.translate(-cameraPosition.x, -cameraPosition.y);

  return projectionMatrix;
}
