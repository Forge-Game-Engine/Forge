import { Matrix3x3 } from '../../math/index.js';

/**
 * Creates a screen-space orthographic projection matrix for UI rendering.
 *
 * Maps screen-space pixel coordinates (top-left origin, +Y down) to WebGL
 * clip space: (0, 0) → (−1, 1), (width, height) → (1, −1).
 *
 * Uses the same `vec × mat` convention as the game's `createProjectionMatrix`.
 *
 * @param width - The viewport width in pixels.
 * @param height - The viewport height in pixels.
 * @returns A 3×3 projection matrix.
 */
export function createUiProjectionMatrix(
  width: number,
  height: number,
): Matrix3x3 {
  const projectionMatrix = Matrix3x3.identity;

  // Scale pixel coords to normalised range: x → [−1, 1], y → [1, −1]
  projectionMatrix.scale(2 / width, -2 / height);

  // Translate so (0, 0) maps to clip (−1, 1) instead of (0, 0)
  projectionMatrix.translate(-width / 2, -height / 2);

  return projectionMatrix;
}
