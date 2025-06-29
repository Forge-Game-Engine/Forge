import { Matrix3x3, Vector2 } from '../../../math';

export function createProjectionMatrixWithCamera(
  width: number,
  height: number,
  cameraPos: Vector2,
  zoom: number,
): Matrix3x3 {
  const m = Matrix3x3.identity;

  // Centered projection: (0,0) is center of screen
  m.scale(2 / width, -2 / height); // Y+ is up, -h/2..h/2 maps to -1..1
  // No translate(-1, 1)

  // Apply zoom around the center
  m.scale(zoom, zoom);

  // Center cameraPos on screen
  m.translate(-cameraPos.x, -cameraPos.y);

  return m;
}
