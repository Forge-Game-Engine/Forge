import { expect, test } from '@playwright/test';
import type {
  TintBrighterThanTextureMeasurement,
  TintBrighterThanTextureSceneHandle,
} from '../fixtures/scenes/tint-brighter-than-texture.js';
import { brightTint } from '../fixtures/scenes/tint-brighter-than-texture-tint.js';

// See `translucent-ui-compositing.spec.ts` for why the hooks are cast inline
// rather than declared per scene.
type Hooks = TintBrighterThanTextureSceneHandle;

// How far the measured brightening may stray from `brightTint`: absorbs
// 8-bit rounding of both samples, while still catching a tint clamped to
// `1`, which leaves the ratio at exactly `1`.
const ratioTolerance = 0.05;

/**
 * Advances the scene by one frame and samples the presented canvas in the
 * same task - see AGENTS.md's "Be wary of pixel-level rendering assertions"
 * for why `step()` and any pixel read must happen in the same
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
): Promise<TintBrighterThanTextureMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure();
  });

test.describe('a tint brighter than white', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the tint-brighter-than-texture scene', async () => {
      // See `translucent-ui-compositing.spec.ts` for why page errors are
      // captured here.
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=tint-brighter-than-texture');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('draws a sprite brighter than its texture', async ({ page }) => {
    const { whiteTinted, brightTinted } =
      await test.step('render one frame and read back the canvas', () =>
        captureMeasurement(page));

    await test.step('assert each channel brightened by the tint', () => {
      for (const channel of ['r', 'g', 'b'] as const) {
        expect(
          brightTinted[channel] / whiteTinted[channel],
          `the ${channel} channel of the sprite tinted ${brightTint} (${brightTinted[channel]}) should be ${brightTint} times the white-tinted one's (${whiteTinted[channel]})`,
        ).toBeGreaterThan(brightTint - ratioTolerance);
        expect(brightTinted[channel] / whiteTinted[channel]).toBeLessThan(
          brightTint + ratioTolerance,
        );
      }
    });
  });
});
