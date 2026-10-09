/**
 * The `tone-curve` scene's cells, as plain numbers. Kept in its own module,
 * free of any `/src` import, so `tone-curve.spec.ts` (which runs under Node)
 * can compute each cell's expected color from them.
 */

/** Each cell's grey HDR value, before exposure, left to right. */
export const toneCurveBrightnesses = [0.25, 0.5, 1, 2, 4, 8];

/** The exposure the scene's tone mapping applies. */
export const toneCurveExposure = 1.5;

/**
 * Each cell's center, as a fraction of the canvas's width from its left
 * edge. Every cell is centered vertically.
 * @param index - The cell's index in `toneCurveBrightnesses`.
 * @returns The cell's center.
 */
export function toneCurveCellCenter(index: number): number {
  return (index + 0.5) / toneCurveBrightnesses.length;
}
