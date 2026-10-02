import { expect, test } from '@playwright/test';
import type { HighDpiCanvasSceneHandle } from '../fixtures/scenes/high-dpi-canvas.js';
import { inputSceneColors } from '../fixtures/scenes/input-scene-colors.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = HighDpiCanvasSceneHandle;
type Page = import('@playwright/test').Page;

// The fixture's #app container is 800x600 CSS pixels (see
// e2e/fixtures/index.html).
const containerCssWidth = 800;
const containerCssHeight = 600;
const deviceScaleFactor = 2;

const captureState = (page: Page) =>
  page.evaluate((green) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      canvasMetrics: scene.canvasMetrics,
      squareWorldCenter: scene.squareWorldCenter,
      squareWorldSize: scene.squareWorldSize,
      devicePixelsPerUnit: scene.devicePixelsPerUnit,
      pointerWorldPosition: scene.pointerWorldPosition,
      squareBounds: scene.measureBounds(green),
    };
  }, inputSceneColors.green);

test.describe('high-DPI canvas', () => {
  test.use({ deviceScaleFactor });

  test.beforeEach(async ({ page }) => {
    await test.step('load the high-dpi-canvas scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=high-dpi-canvas');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test("sizes the canvas's drawing buffer at the device pixel ratio while keeping its CSS size", async ({
    page,
  }) => {
    const state = await test.step('capture the rendered state', () =>
      captureState(page));

    await test.step('assert the drawing buffer is the CSS size times the device pixel ratio', () => {
      expect(state.canvasMetrics).toEqual({
        drawingBufferWidth: containerCssWidth * deviceScaleFactor,
        drawingBufferHeight: containerCssHeight * deviceScaleFactor,
        clientWidth: containerCssWidth,
        clientHeight: containerCssHeight,
        pixelRatio: deviceScaleFactor,
      });
    });

    await test.step('assert the square is rendered across device pixels, not upscaled CSS pixels', () => {
      expect(state.squareBounds).not.toBeNull();

      const measuredWidth =
        state.squareBounds!.right - state.squareBounds!.left + 1;
      const expectedDeviceWidth =
        state.squareWorldSize * state.devicePixelsPerUnit;

      // Generous tolerance for antialiased edges - this only needs to tell
      // a native-resolution square apart from one drawn at CSS resolution,
      // which would be half as many pixels wide.
      expect(measuredWidth).toBeGreaterThan(expectedDeviceWidth * 0.9);
      expect(measuredWidth).toBeLessThan(expectedDeviceWidth * 1.1);
    });
  });

  test('maps a CSS-pixel pointer position onto the rendered world', async ({
    page,
  }) => {
    const before = await test.step('locate the rendered square', () =>
      captureState(page));

    expect(before.squareBounds).not.toBeNull();

    await test.step('move the mouse onto the rendered square', async () => {
      const { left, right, top, bottom } = before.squareBounds!;
      const { pixelRatio } = before.canvasMetrics;

      // The measured bounds are drawing-buffer pixels; the page (and the
      // canvas, at its top-left corner) is laid out in CSS pixels.
      await page.mouse.move(
        (left + right) / 2 / pixelRatio,
        (top + bottom) / 2 / pixelRatio,
      );
    });

    const after = await test.step('capture the pointer world position', () =>
      captureState(page));

    await test.step('assert the pointer resolves to the square it is visibly over', () => {
      const tolerance = after.squareWorldSize / 4;

      expect(
        Math.abs(after.pointerWorldPosition.x - after.squareWorldCenter.x),
      ).toBeLessThan(tolerance);
      expect(
        Math.abs(after.pointerWorldPosition.y - after.squareWorldCenter.y),
      ).toBeLessThan(tolerance);
    });
  });

  test('resizes the drawing buffer when the device pixel ratio changes', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('drop the emulated device pixel ratio to 1', async () => {
      const session = await page.context().newCDPSession(page);
      const viewport = page.viewportSize();

      if (!viewport) {
        throw new Error('The page has no viewport size.');
      }

      await session.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      });

      await page.waitForFunction(
        (cssWidth) =>
          (window.__forgeTestHooks as unknown as Hooks).canvasMetrics
            .drawingBufferWidth === cssWidth,
        containerCssWidth,
      );
    });

    const after = await test.step('capture the state after the change', () =>
      captureState(page));

    await test.step('assert the drawing buffer shrank and the CSS size held', () => {
      expect(after.canvasMetrics).toEqual({
        drawingBufferWidth: containerCssWidth,
        drawingBufferHeight: containerCssHeight,
        clientWidth: containerCssWidth,
        clientHeight: containerCssHeight,
        pixelRatio: 1,
      });
    });

    await test.step('assert the square is now rendered across half as many pixels', () => {
      expect(before.squareBounds).not.toBeNull();
      expect(after.squareBounds).not.toBeNull();

      const widthBefore =
        before.squareBounds!.right - before.squareBounds!.left + 1;
      const widthAfter =
        after.squareBounds!.right - after.squareBounds!.left + 1;
      const expectedWidthAfter =
        widthBefore *
        (after.canvasMetrics.pixelRatio / before.canvasMetrics.pixelRatio);

      expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.9);
      expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.1);
    });
  });
});
