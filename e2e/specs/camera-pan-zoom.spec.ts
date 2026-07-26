import { expect, test } from '@playwright/test';
import type { CameraSceneHandle } from '../fixtures/scenes/camera-pan-zoom.js';
import { clearColorRgb } from '../fixtures/scenes/camera-pan-zoom-clear-color.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`, since every scene assigns to the same global property.
// Each `page.evaluate` callback below narrows it to this spec's own scene
// handle type inline, so multiple scenes' specs can coexist in one tsc
// program without clashing over incompatible `Window` augmentations. The
// cast is compile-time only (erased at runtime), so it's safe to write
// inside a callback that Playwright re-executes in the browser.
type Hooks = CameraSceneHandle;
type Page = import('@playwright/test').Page;

const readZoom = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).zoom);

const readPosition = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).position);

const step = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).step());

// A single wheel tick / held frame changes zoom/position correctly but
// renders as one instantaneous jump - correct, but not watchable in the
// recorded video (playwright.config.ts's `video: 'on'`). `animateFrames`
// spreads the same change over several real-time-spaced frames instead, so
// the camera actually visibly pans/zooms against the scene's checkerboard
// grid when replaying the video, without changing what's being asserted.
const frameSpacingMilliseconds = 60;

/**
 * Runs `onFrame` (if given), advances the scene by one step, then pauses
 * `frameSpacingMilliseconds`, repeated `frameCount` times, in order.
 * Sequential by design: each frame must dispatch, step, and let the
 * previous frame's pause elapse before the next one starts - there's no
 * observable condition to await instead of the fixed pause, and running
 * frames concurrently would collapse the animation into one instantaneous
 * jump, defeating the point of animating it at all.
 */
const animateFrames = async (
  page: Page,
  frameCount: number,
  onFrame?: () => Promise<void>,
): Promise<void> => {
  for (let frame = 0; frame < frameCount; frame++) {
    // eslint-disable-next-line no-await-in-loop
    await onFrame?.();
    // eslint-disable-next-line no-await-in-loop
    await step(page);
    // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
    await page.waitForTimeout(frameSpacingMilliseconds);
  }
};

test.describe('camera pan/zoom', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the camera-pan-zoom scene', async () => {
      // If the scene throws (e.g. WebGL2 context creation fails),
      // harness.ts rethrows after rendering the error into the page - catch
      // it here too so a scene-load failure reports its actual cause
      // instead of a bare "waitForFunction timed out".
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=camera-pan-zoom');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('zooms in when scrolling the mouse wheel up', async ({ page }) => {
    const zoomBefore = await test.step('read starting zoom', () =>
      readZoom(page));

    await test.step('scroll wheel-up over several frames', () =>
      animateFrames(page, 6, () =>
        page.locator('canvas').dispatchEvent('wheel', { deltaY: -100 }),
      ));

    const zoomAfter = await test.step('read zoom after scrolling', () =>
      readZoom(page));

    expect(zoomAfter).toBeGreaterThan(zoomBefore);
  });

  test('zooms out when scrolling the mouse wheel down', async ({ page }) => {
    const zoomBefore = await test.step('read starting zoom', () =>
      readZoom(page));

    await test.step('scroll wheel-down over several frames', () =>
      animateFrames(page, 6, () =>
        page.locator('canvas').dispatchEvent('wheel', { deltaY: 100 }),
      ));

    const zoomAfter = await test.step('read zoom after scrolling', () =>
      readZoom(page));

    expect(zoomAfter).toBeLessThan(zoomBefore);
  });

  test('pans while an arrow key is held, and stops once released', async ({
    page,
  }) => {
    const positionBefore = await test.step('read starting position', () =>
      readPosition(page));

    await test.step('hold ArrowRight over several frames', async () => {
      await page.keyboard.down('ArrowRight');
      await animateFrames(page, 10);
    });

    const positionWhileHeld = await test.step('read position while held', () =>
      readPosition(page));

    expect(positionWhileHeld.x).toBeGreaterThan(positionBefore.x);

    await test.step('release ArrowRight and advance one frame', async () => {
      await page.keyboard.up('ArrowRight');
      await animateFrames(page, 1);
    });

    const positionAfterRelease =
      await test.step('read position after release', () => readPosition(page));

    await test.step('advance one more frame', () => animateFrames(page, 1));

    const positionOneMoreStepLater =
      await test.step('read position one more frame later', () =>
        readPosition(page));

    expect(positionOneMoreStepLater.x).toBe(positionAfterRelease.x);
  });

  test('renders the camera clear color onto the canvas', async ({ page }) => {
    // step() and the pixel readback must happen in the same evaluate call:
    // the canvas isn't created with `preserveDrawingBuffer`, so the browser
    // is free to clear it as soon as control returns after the frame is
    // presented (i.e. between two separate `page.evaluate` round-trips).
    const { pixel, histogram } =
      await test.step('advance a frame and read a background pixel', () =>
        page.evaluate(() => {
          const scene = window.__forgeTestHooks as unknown as Hooks;

          scene.step();

          return {
            pixel: scene.readBackgroundPixel(),
            histogram: scene.readColorHistogram(),
          };
        }));

    // TEMPORARY diagnostics for the CI-only "renders the camera clear
    // color" failure - remove once root-caused.
    console.log('[e2e histogram]', JSON.stringify(histogram));

    await test.step('assert the pixel matches the clear color', () => {
      // Loose tolerance: sRGB/blending rounding differs slightly across
      // SwiftShader vs. hardware GL, this only needs to confirm the real
      // clear color made it to the canvas, not exact byte equality.
      expect(pixel[0]).toBeCloseTo(clearColorRgb.r * 255, -1);
      expect(pixel[1]).toBeCloseTo(clearColorRgb.g * 255, -1);
      expect(pixel[2]).toBeCloseTo(clearColorRgb.b * 255, -1);
    });
  });
});
