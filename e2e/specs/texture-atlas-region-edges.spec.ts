import { expect, test } from '@playwright/test';
import type { TextureAtlasRegionEdgesSceneHandle } from '../fixtures/scenes/texture-atlas-region-edges.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = TextureAtlasRegionEdgesSceneHandle;

test.describe('Texture atlas region edges', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the texture-atlas-region-edges scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=texture-atlas-region-edges');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('tiles cut from a linearly filtered sheet meet without seams', async ({
    page,
  }) => {
    // Steps a frame and measures it in the same task - see AGENTS.md's "Be
    // wary of pixel-level rendering assertions".
    const measurement = await test.step('render a frame', () =>
      page.evaluate(() => {
        const scene = window.__forgeTestHooks as unknown as Hooks;

        scene.step();

        return scene.measure();
      }));

    await test.step('assert the block of tiles is one solid color', () => {
      expect(measurement.tileDiffersFromBackground).toBe(true);
      // A tile that blended in its transparent neighbors in the sheet would
      // fade towards the background along every edge, over about a tenth
      // of the block's pixels.
      expect(measurement.mismatchInsideBlock).toBeLessThan(0.01);
    });
  });
});
