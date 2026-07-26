import { expect, test } from '@playwright/test';
import type { CameraSceneHandle } from '../fixtures/scenes/camera-pan-zoom.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`, since every scene assigns to the same global property.
// Each `page.evaluate` callback below narrows it to this spec's own scene
// handle type inline, so multiple scenes' specs can coexist in one tsc
// program without clashing over incompatible `Window` augmentations. The
// cast is compile-time only (erased at runtime), so it's safe to write
// inside a callback that Playwright re-executes in the browser.
type Hooks = CameraSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Advances the scene by one frame and captures the camera's logic state
 * (`zoom`, `position`) *and* what's actually rendered (the green origin
 * square's on-screen bounds) in a single `page.evaluate` call. Pairing them
 * is what lets a test assert the two agree with each other, not just that
 * the logic state changed - see AGENTS.md's "Be wary of pixel-level
 * rendering assertions" for why `step()` and any pixel read must happen in
 * the same task.
 */
const captureState = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      zoom: scene.zoom,
      position: scene.position,
      bounds: scene.measureGreenSquareBounds(),
    };
  });

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
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('scroll wheel-up over several frames', () =>
      animateFrames(page, 6, () =>
        page.locator('canvas').dispatchEvent('wheel', { deltaY: -100 }),
      ));

    const after = await test.step('capture the state after scrolling', () =>
      captureState(page));

    expect(after.zoom).toBeGreaterThan(before.zoom);

    await test.step('assert the green square grew on screen by the same ratio as the zoom change', () => {
      expect(before.bounds).not.toBeNull();
      expect(after.bounds).not.toBeNull();

      const widthBefore = before.bounds!.right - before.bounds!.left;
      const widthAfter = after.bounds!.right - after.bounds!.left;
      const expectedWidthAfter = widthBefore * (after.zoom / before.zoom);

      // Generous tolerance: pixel quantization and antialiased edges mean
      // an exact match isn't realistic - this only needs to confirm the
      // on-screen size actually tracks the zoom change, not match it to
      // the pixel.
      expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.8);
      expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.2);
    });
  });

  test('zooms out when scrolling the mouse wheel down', async ({ page }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('scroll wheel-down over several frames', () =>
      animateFrames(page, 6, () =>
        page.locator('canvas').dispatchEvent('wheel', { deltaY: 100 }),
      ));

    const after = await test.step('capture the state after scrolling', () =>
      captureState(page));

    expect(after.zoom).toBeLessThan(before.zoom);

    await test.step('assert the green square shrank on screen by the same ratio as the zoom change', () => {
      expect(before.bounds).not.toBeNull();
      expect(after.bounds).not.toBeNull();

      const widthBefore = before.bounds!.right - before.bounds!.left;
      const widthAfter = after.bounds!.right - after.bounds!.left;
      const expectedWidthAfter = widthBefore * (after.zoom / before.zoom);

      expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.8);
      expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.2);
    });
  });

  test('pans while an arrow key is held, and stops once released', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('hold ArrowRight over several frames', async () => {
      await page.keyboard.down('ArrowRight');
      await animateFrames(page, 10);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.position.x).toBeGreaterThan(before.position.x);

    await test.step('assert the green square visibly shifted left on screen by the expected amount', () => {
      expect(before.bounds).not.toBeNull();
      expect(whileHeld.bounds).not.toBeNull();

      const centerBefore = (before.bounds!.left + before.bounds!.right) / 2;
      const centerWhileHeld =
        (whileHeld.bounds!.left + whileHeld.bounds!.right) / 2;
      const actualShift = centerWhileHeld - centerBefore;

      // Panning the camera right moves world content left on screen (see
      // createProjectionMatrix's `translate(-cameraPosition.x, ...)`); world
      // units map 1:1 to pixels at zoom 1, scaling with zoom otherwise.
      const expectedShift =
        -(whileHeld.position.x - before.position.x) * whileHeld.zoom;

      expect(actualShift).toBeLessThan(0);
      expect(Math.abs(actualShift - expectedShift)).toBeLessThan(
        Math.abs(expectedShift) * 0.3 + 5,
      );
    });

    await test.step('release ArrowRight and advance one frame', async () => {
      await page.keyboard.up('ArrowRight');
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after release', () =>
        captureState(page));

    const oneMoreStepLater =
      await test.step('capture the state one more frame later', () =>
        captureState(page));

    expect(oneMoreStepLater.position.x).toBe(afterRelease.position.x);

    await test.step('assert the green square visibly stopped moving too', () => {
      expect(afterRelease.bounds).not.toBeNull();
      expect(oneMoreStepLater.bounds).not.toBeNull();
      expect(oneMoreStepLater.bounds).toEqual(afterRelease.bounds);
    });
  });
});
