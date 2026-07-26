import { Matrix3x3, Vector2 } from '../../../math/index.js';

/**
 * Creates a projection matrix for rendering with a camera.
 * The projection matrix is centered on the camera position and applies zoom.
 *
 * @param width - The width of the viewport.
 * @param height - The height of the viewport.
 * @param cameraPosition - The position of the camera in world coordinates.
 * @param zoom - The zoom level to apply to the projection.
 * @param pixelsPerUnit - The number of pixels one world unit occupies (see
 * `calculatePixelsPerUnit`). Defaults to `1`.
 * @returns A 3x3 projection matrix that can be used for rendering.
 */
export function createProjectionMatrix(
  width: number,
  height: number,
  cameraPosition: Vector2,
  zoom: number,
  pixelsPerUnit: number = 1,
): Matrix3x3 {
  const projectionMatrix = Matrix3x3.identity;

  // Centered projection: (0,0) is center of screen. World units are
  // converted to pixels before pixels are converted to clip space.
  projectionMatrix.scale(
    (2 / width) * pixelsPerUnit,
    (-2 / height) * pixelsPerUnit,
  );

  // Apply zoom around the center
  projectionMatrix.scale(zoom, zoom);

  // Center cameraPos on screen. Sprite instance data negates world.y before
  // it reaches the shader (see bindSpriteInstanceData), so unlike x, the
  // camera's y must be translated unnegated to land back on the same sprite.
  projectionMatrix.translate(-cameraPosition.x, cameraPosition.y);

  return projectionMatrix;
}
