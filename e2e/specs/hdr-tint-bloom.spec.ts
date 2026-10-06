import { expect, test } from '@playwright/test';
import type {
  HdrTintBloomMeasurement,
  HdrTintBloomSceneHandle,
} from '../fixtures/scenes/hdr-tint-bloom.js';

// See `translucent-ui-compositing.spec.ts` for why the hooks are cast inline
// rather than declared per scene.
type Hooks = HdrTintBloomSceneHandle;

// How much brighter the halo around the sprite tinted above white must be
// than the white-tinted one's, on each channel, to prove the extra
// brightness reached bloom. A tint clamped to `1` leaves the two halos
// identical.
const minimumHaloGain = 10;

/**
 * Advances the scene by one frame and samples the presented canvas in the
 * same task - see AGENTS.md's "Be wary of pixel-level rendering assertions"
 * for why `step()` and any pixel read must happen in the same
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
): Promise<HdrTintBloomMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure();
  });

test.describe('a tint brighter than white on an HDR camera', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the hdr-tint-bloom scene', async () => {
      // See `translucent-ui-compositing.spec.ts` for why page errors are
      // captured here.
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=hdr-tint-bloom');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('blooms more than a white-tinted sprite', async ({ page }) => {
    const { format, whiteTintedHalo, brightTintedHalo } =
      await test.step('render one frame and read back the canvas', () =>
        captureMeasurement(page));

    await test.step('assert the camera renders in HDR', () => {
      expect(
        format,
        'the browser should support EXT_color_buffer_float, or the render target falls back to ldr and clamps the tint',
      ).toBe('hdr');
    });

    await test.step('assert the brighter sprite has the brighter halo', () => {
      for (const channel of ['r', 'g', 'b'] as const) {
        expect(
          brightTintedHalo[channel],
          `the ${channel} channel of the halo around the sprite tinted above white should be brighter than the white-tinted sprite's (${whiteTintedHalo[channel]})`,
        ).toBeGreaterThan(whiteTintedHalo[channel] + minimumHaloGain);
      }
    });
  });
});
