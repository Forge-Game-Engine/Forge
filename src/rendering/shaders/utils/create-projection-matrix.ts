import { Matrix3x3, Vector2 } from '../../../math';

/**
 * Creates a projection matrix for mapping 0..width to -1..1 in X and 0..height to -1..1 in Y.
 *
 * @param width - The width of the projection area.
 * @param height - The height of the projection area.
 * @returns A 3x3 projection matrix.
 */
export const createProjectionMatrix = (
  width: number,
  height: number,
): Matrix3x3 => {
  // This matrix maps 0..width to 0..2, so that 0..width -> -1..1 in X
  // and 0..height -> -1..1 in Y
  return new Matrix3x3([2 / width, 0, 0, 0, -2 / height, 0, -1, 1, 1]); // 3x3 matrix
};

export function createProjectionMatrixWithCamera(
  width: number,
  height: number,
  cameraPos: Vector2,
  zoom: number,
): Matrix3x3 {
  const m = Matrix3x3.identity;

  // Convert from pixels to NDC
  m.scale(2 / width, -2 / height); // Y flipped
  m.translate(-1, 1);

  // Apply zoom around the center of the screen
  m.translate(1, -1);
  m.scale(zoom, zoom);
  m.translate(-1, 1);

  // Apply camera panning (center cameraPos on screen)
  m.translate(-cameraPos.x + width / 2, -cameraPos.y + height / 2);

  return m;
}
