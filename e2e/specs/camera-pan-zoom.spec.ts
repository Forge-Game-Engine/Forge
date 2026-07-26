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

const readZoom = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).zoom);

const readPosition = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).position);

const step = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).step());

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

    await test.step('dispatch wheel-up on the canvas', () =>
      page.locator('canvas').dispatchEvent('wheel', { deltaY: -100 }));
    await test.step('advance one frame', () => step(page));

    const zoomAfter = await test.step('read zoom after the frame', () =>
      readZoom(page));

    expect(zoomAfter).toBeGreaterThan(zoomBefore);
  });

  test('zooms out when scrolling the mouse wheel down', async ({ page }) => {
    const zoomBefore = await test.step('read starting zoom', () =>
      readZoom(page));

    await test.step('dispatch wheel-down on the canvas', () =>
      page.locator('canvas').dispatchEvent('wheel', { deltaY: 100 }));
    await test.step('advance one frame', () => step(page));

    const zoomAfter = await test.step('read zoom after the frame', () =>
      readZoom(page));

    expect(zoomAfter).toBeLessThan(zoomBefore);
  });

  test('pans while an arrow key is held, and stops once released', async ({
    page,
  }) => {
    const positionBefore = await test.step('read starting position', () =>
      readPosition(page));

    await test.step('hold ArrowRight and advance two frames', async () => {
      await page.keyboard.down('ArrowRight');
      await step(page);
      await step(page);
    });

    const positionWhileHeld = await test.step('read position while held', () =>
      readPosition(page));

    expect(positionWhileHeld.x).toBeGreaterThan(positionBefore.x);

    await test.step('release ArrowRight and advance one frame', async () => {
      await page.keyboard.up('ArrowRight');
      await step(page);
    });

    const positionAfterRelease =
      await test.step('read position after release', () => readPosition(page));

    await test.step('advance one more frame', () => step(page));

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
    const pixel =
      await test.step('advance a frame and read the center pixel', () =>
        page.evaluate(() => {
          const scene = window.__forgeTestHooks as unknown as Hooks;

          scene.step();

          return scene.readCenterPixel();
        }));

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
