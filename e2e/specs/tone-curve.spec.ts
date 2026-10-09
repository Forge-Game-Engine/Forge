import { test } from '@playwright/test';
import { expectColorClose, sampleCanvas } from '../helpers/canvas-samples.js';
import { openScene, stepScene } from '../helpers/open-scene.js';
import {
  toneCurveBrightnesses,
  toneCurveCellCenter,
  toneCurveExposure,
} from '../fixtures/scenes/tone-curve-cells.js';

// The operators' published curves, applied per channel to an exposed value.
const curves = {
  reinhard: (value: number): number => value / (value + 1),
  // Narkowicz's fit of the ACES filmic curve.
  aces: (value: number): number => {
    const curve =
      (value * (2.51 * value + 0.03)) / (value * (2.43 * value + 0.59) + 0.14);

    return Math.min(Math.max(curve, 0), 1);
  },
};

// The HDR target stores half floats, and the canvas 8 bits, which rounds by
// up to half a step; a step on either side covers both.
const tolerance = 1.5 / 255;

for (const [operator, curve] of Object.entries(curves)) {
  test(
    `${operator} tone mapping matches its curve`,
    { tag: '@analytic' },
    async ({ page }) => {
      await openScene(page, 'tone-curve', { operator });
      await stepScene(page, 1);

      const samples = await sampleCanvas(
        page,
        toneCurveBrightnesses.map((_, index) => ({
          x: toneCurveCellCenter(index),
          y: 0.5,
        })),
      );

      for (const [index, brightness] of toneCurveBrightnesses.entries()) {
        const value = curve(brightness * toneCurveExposure);

        expectColorClose(
          samples[index],
          { r: value, g: value, b: value, a: 1 },
          tolerance,
          `the cell at ${brightness} × exposure ${toneCurveExposure}`,
        );
      }
    },
  );
}
