import { Vector2 } from '../../math/index.js';

/**
 * Computes the full width/height, in world units, a camera's view spans at
 * the given destination dimensions: `verticalWorldUnits` tall, with the
 * width following automatically from the destination's aspect ratio. Use
 * this instead of reading `RenderContext.width`/`height` in pixels directly
 * for world-space layout (spawn bounds, movement limits, background sizing,
 * ...), so that layout stays correct across resolutions and aspect ratios.
 * @param canvasWidth - The render destination's width, in pixels.
 * @param canvasHeight - The render destination's height, in pixels.
 * @param verticalWorldUnits - The total world-space height the camera shows (see `CameraEcsComponent.verticalWorldUnits`).
 * @returns The visible width/height, in world units.
 * @throws An error if any argument is not positive.
 */
export function calculateVisibleWorldSize(
  canvasWidth: number,
  canvasHeight: number,
  verticalWorldUnits: number,
): Vector2 {
  if (canvasWidth <= 0 || canvasHeight <= 0 || verticalWorldUnits <= 0) {
    throw new Error(
      `calculateVisibleWorldSize requires positive values, received canvasWidth=${canvasWidth}, canvasHeight=${canvasHeight}, verticalWorldUnits=${verticalWorldUnits}.`,
    );
  }

  const aspectRatio = canvasWidth / canvasHeight;

  return new Vector2(verticalWorldUnits * aspectRatio, verticalWorldUnits);
}
