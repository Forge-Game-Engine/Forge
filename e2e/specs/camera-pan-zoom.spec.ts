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

test.describe('camera pan/zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scene=camera-pan-zoom');
    await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
  });

  test('zooms in when scrolling the mouse wheel up', async ({ page }) => {
    const zoomBefore = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).zoom,
    );

    await page.locator('canvas').dispatchEvent('wheel', { deltaY: -100 });
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );

    const zoomAfter = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).zoom,
    );

    expect(zoomAfter).toBeGreaterThan(zoomBefore);
  });

  test('zooms out when scrolling the mouse wheel down', async ({ page }) => {
    const zoomBefore = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).zoom,
    );

    await page.locator('canvas').dispatchEvent('wheel', { deltaY: 100 });
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );

    const zoomAfter = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).zoom,
    );

    expect(zoomAfter).toBeLessThan(zoomBefore);
  });

  test('pans while an arrow key is held, and stops once released', async ({
    page,
  }) => {
    const positionBefore = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).position,
    );

    await page.keyboard.down('ArrowRight');
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );

    const positionWhileHeld = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).position,
    );

    expect(positionWhileHeld.x).toBeGreaterThan(positionBefore.x);

    await page.keyboard.up('ArrowRight');
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );

    const positionAfterRelease = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).position,
    );

    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).step(),
    );

    const positionOneMoreStepLater = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).position,
    );

    expect(positionOneMoreStepLater.x).toBe(positionAfterRelease.x);
  });

  test('renders the camera clear color onto the canvas', async ({ page }) => {
    // step() and the pixel readback must happen in the same evaluate call:
    // the canvas isn't created with `preserveDrawingBuffer`, so the browser
    // is free to clear it as soon as control returns after the frame is
    // presented (i.e. between two separate `page.evaluate` round-trips).
    const pixel = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return scene.readCenterPixel();
    });

    // Loose tolerance: sRGB/blending rounding differs slightly across
    // SwiftShader vs. hardware GL, this only needs to confirm the real
    // clear color made it to the canvas, not exact byte equality.
    expect(pixel[0]).toBeCloseTo(clearColorRgb.r * 255, -1);
    expect(pixel[1]).toBeCloseTo(clearColorRgb.g * 255, -1);
    expect(pixel[2]).toBeCloseTo(clearColorRgb.b * 255, -1);
  });
});
