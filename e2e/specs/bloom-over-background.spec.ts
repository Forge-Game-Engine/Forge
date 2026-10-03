import { expect, test } from '@playwright/test';
import type {
  BloomOverBackgroundMeasurement,
  BloomOverBackgroundSceneHandle,
} from '../fixtures/scenes/bloom-over-background.js';

// See `translucent-ui-compositing.spec.ts` for why the hooks are cast inline
// rather than declared per scene.
type Hooks = BloomOverBackgroundSceneHandle;

// How far a halo channel may fall below the background's own value and
// still count as unchanged: absorbs 8-bit rounding, while still catching a
// glow that partly covers the background, which drops blue next to the
// sprite to a fraction of its value here.
const quantizationTolerance = 1;

// How much the glow must brighten the background's red channel just past
// the sprite's edge, to prove the halo actually shows there.
const minimumHaloRedGain = 20;

/**
 * Advances the scene by one frame and samples the presented canvas in the
 * same task - see AGENTS.md's "Be wary of pixel-level rendering assertions"
 * for why `step()` and any pixel read must happen in the same
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
): Promise<BloomOverBackgroundMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure();
  });

test.describe('bloom over a background layer', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the bloom-over-background scene', async () => {
      // See `translucent-ui-compositing.spec.ts` for why page errors are
      // captured here.
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=bloom-over-background');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('adds the glow to the background without dimming any of its channels', async ({
    page,
  }) => {
    const { farBackground, lowestHaloBlue, highestHaloRed } =
      await test.step('render one frame and read back the canvas', () =>
        captureMeasurement(page));

    await test.step('assert the halo shows past the sprite', () => {
      expect(
        highestHaloRed,
        `the yellow glow should brighten the background's red past the sprite's edge (far background ${JSON.stringify(farBackground)})`,
      ).toBeGreaterThan(farBackground.r + minimumHaloRedGain);
    });

    await test.step("assert the halo doesn't dim the background's blue", () => {
      expect(
        lowestHaloBlue,
        `a yellow glow has no blue, so it should leave the background's blue (${farBackground.b} far from the sprite) unchanged`,
      ).toBeGreaterThanOrEqual(farBackground.b - quantizationTolerance);
    });
  });
});
