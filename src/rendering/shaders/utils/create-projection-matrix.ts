import { Matrix3x3, Rect } from '../../../math/index.js';

/**
 * Creates the projection matrix that maps a world-space area onto clip
 * space, filling the destination it's drawn into. The area's top-left
 * corner (`bounds.min`, since the world is Y-down) lands at the top-left of
 * the destination.
 *
 * @param bounds - The world-space area to show, such as a camera's
 * `CameraView.bounds` (see `computeCameraView`).
 * @returns A 3x3 projection matrix that can be used for rendering.
 */
export function createProjectionMatrix(bounds: Rect): Matrix3x3 {
  const projectionMatrix = Matrix3x3.identity;
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;

  // The world is Y-down and clip space is Y-up, so y scales by a negative
  // factor: `bounds.min` (the top-left corner) lands at clip (-1, 1).
  projectionMatrix.scale(2 / width, -2 / height);
  projectionMatrix.translate(
    -(bounds.min.x + width / 2),
    -(bounds.min.y + height / 2),
  );

  return projectionMatrix;
}
