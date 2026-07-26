/**
 * Computes pixels-per-unit from a camera's `verticalWorldUnits` and the
 * current canvas height, so a world unit spans a consistent number of
 * screen pixels regardless of vertical resolution.
 * @param canvasHeight - The render destination's height, in pixels.
 * @param verticalWorldUnits - The total world-space height the camera should show.
 * @returns The number of pixels one world unit occupies vertically.
 * @throws An error if `canvasHeight` or `verticalWorldUnits` is not positive.
 */
export function calculatePixelsPerUnit(
  canvasHeight: number,
  verticalWorldUnits: number,
): number {
  if (canvasHeight <= 0 || verticalWorldUnits <= 0) {
    throw new Error(
      `calculatePixelsPerUnit requires positive values, received canvasHeight=${canvasHeight}, verticalWorldUnits=${verticalWorldUnits}.`,
    );
  }

  return canvasHeight / verticalWorldUnits;
}
