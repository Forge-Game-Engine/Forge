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

/**
 * The page-global list `recordMediaQueryLists` collects every
 * `MediaQueryList` the page creates into.
 */
interface MediaQueryListRecorder {
  forgeMediaQueryLists: MediaQueryList[];
}

/**
 * Runs in the page before any of its own scripts: wraps `matchMedia` so every
 * `MediaQueryList` it returns is also recorded, letting a test reach the one
 * the engine is listening on.
 */
const recordMediaQueryLists = (): void => {
  const recorder = window as unknown as MediaQueryListRecorder;
  const originalMatchMedia = window.matchMedia.bind(window);

  recorder.forgeMediaQueryLists = [];

  window.matchMedia = (query: string): MediaQueryList => {
    const mediaQueryList = originalMatchMedia(query);

    recorder.forgeMediaQueryLists.push(mediaQueryList);

    return mediaQueryList;
  };
};

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

      await page.addInitScript(recordMediaQueryLists);
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
        renderTargetWidth: containerCssWidth * deviceScaleFactor,
        renderTargetHeight: containerCssHeight * deviceScaleFactor,
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

    await test.step('drop the device pixel ratio to 1', async () => {
      // Simulates what the browser does when the page is zoomed or moved to
      // a monitor with a different scale factor - `devicePixelRatio` changes
      // and every `(resolution: ...)` media query that no longer matches
      // fires `change` - by doing both directly. Emulating the change through
      // a separate CDP session's `Emulation.setDeviceMetricsOverride` instead
      // isn't reliable across Chromium versions: it can be ignored while
      // Playwright's own session is already emulating `deviceScaleFactor`.
      // Everything downstream of the notification (the engine's watcher, the
      // deferred resize, the next rendered frame) still runs for real.
      await page.evaluate(() => {
        Object.defineProperty(window, 'devicePixelRatio', {
          configurable: true,
          get: () => 1,
        });

        const recorder = window as unknown as MediaQueryListRecorder;
        const resolutionQueries = recorder.forgeMediaQueryLists.filter(
          (mediaQueryList) => mediaQueryList.media.includes('resolution'),
        );

        if (resolutionQueries.length === 0) {
          throw new Error(
            'The page never created a resolution media query to watch the device pixel ratio with.',
          );
        }

        for (const mediaQueryList of resolutionQueries) {
          mediaQueryList.dispatchEvent(new Event('change'));
        }
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
        renderTargetWidth: containerCssWidth,
        renderTargetHeight: containerCssHeight,
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

  test('keeps a canvas-sized camera target matched to the canvas when its container resizes', async ({
    page,
  }) => {
    const resizedCssWidth = 600;
    const resizedCssHeight = 400;

    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('resize the container', async () => {
      await page.evaluate(
        ({ width, height }) => {
          const container = document.getElementById('app');

          if (!container) {
            throw new Error('The fixture has no #app container.');
          }

          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
        },
        { width: resizedCssWidth, height: resizedCssHeight },
      );

      await page.waitForFunction(
        (drawingBufferWidth) =>
          (window.__forgeTestHooks as unknown as Hooks).canvasMetrics
            .drawingBufferWidth === drawingBufferWidth,
        resizedCssWidth * deviceScaleFactor,
      );
    });

    const after = await test.step('capture the state after the resize', () =>
      captureState(page));

    await test.step('assert the render target followed the drawing buffer', () => {
      expect(after.canvasMetrics.renderTargetWidth).toBe(
        resizedCssWidth * deviceScaleFactor,
      );
      expect(after.canvasMetrics.renderTargetHeight).toBe(
        resizedCssHeight * deviceScaleFactor,
      );
    });

    await test.step('assert the square shrank with the canvas height', () => {
      expect(before.squareBounds).not.toBeNull();
      expect(after.squareBounds).not.toBeNull();

      // The camera shows a fixed number of world units vertically, so the
      // square's on-screen size scales with the canvas's height.
      const widthBefore =
        before.squareBounds!.right - before.squareBounds!.left + 1;
      const widthAfter =
        after.squareBounds!.right - after.squareBounds!.left + 1;
      const expectedWidthAfter =
        widthBefore * (resizedCssHeight / containerCssHeight);

      expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.9);
      expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.1);
    });
  });

  test('re-renders at a lower resolution when maxPixelRatio is lowered at runtime', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    const after =
      await test.step('cap the pixel ratio at 1 and capture the next frame', () =>
        page.evaluate((green) => {
          const scene = window.__forgeTestHooks as unknown as Hooks;

          scene.setMaxPixelRatio(1);
          scene.step();

          return {
            canvasMetrics: scene.canvasMetrics,
            squareBounds: scene.measureBounds(green),
          };
        }, inputSceneColors.green));

    await test.step('assert the canvas and its render target dropped to CSS resolution', () => {
      expect(after.canvasMetrics).toEqual({
        drawingBufferWidth: containerCssWidth,
        drawingBufferHeight: containerCssHeight,
        clientWidth: containerCssWidth,
        clientHeight: containerCssHeight,
        pixelRatio: 1,
        renderTargetWidth: containerCssWidth,
        renderTargetHeight: containerCssHeight,
      });
    });

    await test.step('assert the square is rendered across half as many pixels', () => {
      expect(before.squareBounds).not.toBeNull();
      expect(after.squareBounds).not.toBeNull();

      const widthBefore =
        before.squareBounds!.right - before.squareBounds!.left + 1;
      const widthAfter =
        after.squareBounds!.right - after.squareBounds!.left + 1;
      const expectedWidthAfter = widthBefore / deviceScaleFactor;

      expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.9);
      expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.1);
    });
  });
});
