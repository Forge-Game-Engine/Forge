import { Matrix3x3, Rect } from '../../../math/index.js';

/**
 * Creates the projection matrix that maps a world-space area onto clip
 * space, filling the destination it's drawn into.
 *
 * @param bounds - The world-space area to show, such as a camera's
 * `CameraView.bounds` (see `computeCameraView`).
 * @returns A 3x3 projection matrix that can be used for rendering.
 */
export function createProjectionMatrix(bounds: Rect): Matrix3x3 {
  const projectionMatrix = Matrix3x3.identity;
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;

  projectionMatrix.scale(2 / width, -2 / height);

  // Center the area on screen. Sprite instance data negates world.y before
  // it reaches the shader (see bindSpriteInstanceData), so unlike x, the
  // center's y must be translated unnegated to land back on the same sprite.
  projectionMatrix.translate(
    -(bounds.min.x + width / 2),
    bounds.min.y + height / 2,
  );

  return projectionMatrix;
}
