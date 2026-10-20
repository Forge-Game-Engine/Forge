import { expect, test } from '@playwright/test';
import type {
  RegionEdgesMeasurement,
  TextureAtlasRegionEdgesSceneHandle,
} from '../fixtures/scenes/texture-atlas-region-edges.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = TextureAtlasRegionEdgesSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Steps a frame and measures it in the same task - see AGENTS.md's "Be wary
 * of pixel-level rendering assertions".
 */
const stepAndMeasure = (
  page: Page,
  deltaMilliseconds?: number,
): Promise<RegionEdgesMeasurement> =>
  page.evaluate((delta) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step(delta);

    return scene.measure();
  }, deltaMilliseconds);

/**
 * Scrolls the mouse wheel `ticks` times, one tick a frame, measuring every
 * frame. A negative `deltaY` zooms in.
 */
const scrollAndMeasure = async (
  page: Page,
  ticks: number,
  deltaY: number,
): Promise<RegionEdgesMeasurement[]> => {
  const measurements: RegionEdgesMeasurement[] = [];

  // Sequential by design: each tick has to reach the input source before
  // the frame that reads it.
  for (let tick = 0; tick < ticks; tick++) {
    // eslint-disable-next-line no-await-in-loop
    await page.locator('canvas').dispatchEvent('wheel', { deltaY });
    // eslint-disable-next-line no-await-in-loop
    measurements.push(await stepAndMeasure(page));
  }

  return measurements;
};

/**
 * Asserts a frame drew the block of tiles as one solid color. A tile that
 * blended in its transparent neighbors in the sheet would fade towards the
 * background along every edge, over about a tenth of the block's pixels.
 */
const expectSeamless = (measurement: RegionEdgesMeasurement): void => {
  expect(measurement.tileDiffersFromBackground).toBe(true);
  expect(measurement.mismatchInsideBlock).toBeLessThan(0.01);
};

const widthOf = (measurement: RegionEdgesMeasurement): number => {
  expect(measurement.renderedBlock).not.toBeNull();

  return measurement.renderedBlock!.right - measurement.renderedBlock!.left;
};

const centerOf = (measurement: RegionEdgesMeasurement): number => {
  expect(measurement.renderedBlock).not.toBeNull();

  return (
    (measurement.renderedBlock!.left + measurement.renderedBlock!.right) / 2
  );
};

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
    const measurement = await test.step('render a frame', () =>
      stepAndMeasure(page));

    await test.step('assert the block of tiles is one solid color', () => {
      expectSeamless(measurement);
    });
  });

  test('tiles stay seamless at every zoom while the camera zooms in', async ({
    page,
  }) => {
    const before = await test.step('render a frame', () =>
      stepAndMeasure(page));
    const frames = await test.step('scroll the wheel up, a tick a frame', () =>
      scrollAndMeasure(page, 8, -100));
    const after = frames[frames.length - 1];

    expect(after.zoom).toBeGreaterThan(before.zoom * 2);

    await test.step('assert every frame drew the block as one solid color', () => {
      frames.forEach(expectSeamless);
    });

    await test.step('assert the block grew on screen by the zoom ratio', () => {
      const expectedWidth = widthOf(before) * (after.zoom / before.zoom);

      expect(widthOf(after)).toBeGreaterThan(expectedWidth * 0.9);
      expect(widthOf(after)).toBeLessThan(expectedWidth * 1.1);
    });
  });

  test('tiles stay seamless at every zoom while the camera zooms out until a texel is smaller than a pixel', async ({
    page,
  }) => {
    const before = await test.step('render a frame', () =>
      stepAndMeasure(page));
    const frames =
      await test.step('scroll the wheel down, a tick a frame, to the minimum zoom', () =>
        scrollAndMeasure(page, 25, 100));
    const after = frames[frames.length - 1];

    await test.step('assert the camera reached a zoom where a texel spans less than a pixel', () => {
      // A tile is 64 world units and 8 texels wide.
      const worldUnitsPerTexel = 64 / 8;
      const devicePixelsPerTexel =
        after.devicePixelsPerUnitAtZoomOne * after.zoom * worldUnitsPerTexel;

      expect(after.zoom).toBeCloseTo(0.1);
      expect(devicePixelsPerTexel).toBeLessThan(1);
    });

    await test.step('assert every frame drew the block as one solid color', () => {
      frames.forEach(expectSeamless);
    });

    await test.step('assert the block shrank on screen by the zoom ratio', () => {
      const expectedWidth = widthOf(before) * (after.zoom / before.zoom);

      expect(widthOf(after)).toBeGreaterThan(expectedWidth * 0.8);
      expect(widthOf(after)).toBeLessThan(expectedWidth * 1.2);
    });
  });

  test('tiles stay seamless at every sub-pixel offset while the camera pans', async ({
    page,
  }) => {
    const before = await test.step('render a frame', () =>
      stepAndMeasure(page));

    // Frames of uneven, fractional length move the camera by uneven,
    // fractional numbers of pixels, so tile edges land at many different
    // offsets within a pixel.
    const frames =
      await test.step('hold ArrowRight and ArrowDown for frames of uneven length', async () => {
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('ArrowDown');

        const measurements: RegionEdgesMeasurement[] = [];

        for (let frame = 0; frame < 12; frame++) {
          // eslint-disable-next-line no-await-in-loop
          measurements.push(await stepAndMeasure(page, 3.7 + frame * 1.31));
        }

        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('ArrowDown');

        return measurements;
      });
    const after = frames[frames.length - 1];

    expect(after.cameraPosition.x).toBeGreaterThan(before.cameraPosition.x);
    expect(after.cameraPosition.y).toBeGreaterThan(before.cameraPosition.y);

    await test.step('assert every frame drew the block as one solid color', () => {
      frames.forEach(expectSeamless);
    });

    await test.step('assert the block moved left on screen by the distance the camera panned', () => {
      // Panning the camera right moves the world left on screen.
      const expectedShift =
        -(after.cameraPosition.x - before.cameraPosition.x) *
        after.devicePixelsPerUnitAtZoomOne *
        after.zoom;
      const actualShift = centerOf(after) - centerOf(before);

      expect(expectedShift).toBeLessThan(-20);
      expect(Math.abs(actualShift - expectedShift)).toBeLessThan(3);
    });
  });
});
