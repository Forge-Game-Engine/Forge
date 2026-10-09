import { expect, type Page, test } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * How far a capture may differ from its golden. The configuration's default
 * is `threshold: 0.02` and `maxDiffPixelRatio: 0.002`; a spec that loosens
 * either says why next to the value.
 */
export interface GoldenTolerance {
  /**
   * How different a pixel's color may be before it counts as differing, `0`
   * (exact) to `1` (any). The allowed perceptual (YIQ) distance grows with
   * its square: `0.02` lets a grey move by about 5 of 255 levels, `0.05` by
   * about 13.
   */
  threshold?: number;

  /** The fraction of pixels that may differ, `0`-`1`. */
  maxDiffPixelRatio?: number;
}

/**
 * Compares the canvas element with its reference image,
 * `e2e/golden/images/<name>.png`. The scene's render context must keep its
 * drawing buffer (`preserveDrawingBuffer`, as `createGoldenSceneContext`
 * sets), since the capture happens after the frame was presented.
 * @param page - The page holding the canvas.
 * @param name - The reference image's name, without the extension.
 * @param tolerance - How far the capture may differ (default: the
 * configuration's).
 */
export async function expectGolden(
  page: Page,
  name: string,
  tolerance: GoldenTolerance = {},
): Promise<void> {
  const canvas = page.locator('canvas');
  const testInfo = test.info();
  const imageName = `${name}.png`;

  // A missing golden fails without being written (only CI writes goldens),
  // so save what the canvas shows next to the failure, to look at before
  // the update workflow commits it.
  if (!existsSync(testInfo.snapshotPath(imageName, { kind: 'screenshot' }))) {
    const actualPath = testInfo.outputPath(`${name}-actual.png`);

    await canvas.screenshot({ path: actualPath });
    await testInfo.attach(`${name}-actual`, {
      path: actualPath,
      contentType: 'image/png',
    });
  }

  await expect(canvas).toHaveScreenshot(imageName, tolerance);
}
