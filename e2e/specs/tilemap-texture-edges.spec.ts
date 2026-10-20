import { expect, test } from '@playwright/test';
import type {
  TilemapTextureEdgesMeasurement,
  TilemapTextureEdgesSceneHandle,
} from '../fixtures/scenes/tilemap-texture-edges.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = TilemapTextureEdgesSceneHandle;
type Page = import('@playwright/test').Page;
type TextureFilter = TilemapTextureEdgesMeasurement['filter'];

/** Where the camera is for one frame. */
interface CameraPose {
  x: number;
  y: number;
  zoom: number;
}

// Fractional positions and zooms, so tile edges land at many different
// offsets within a pixel, from a texel spanning less than a pixel (zoom
// 0.3: a 64-unit, 8-texel tile is about 18 pixels) to one spanning about
// 30.
const cameraPoses: readonly CameraPose[] = [
  { x: 0, y: 0, zoom: 1 },
  { x: 0.13, y: 0.71, zoom: 1 },
  { x: 3.37, y: -2.91, zoom: 1.37 },
  { x: -7.53, y: 5.19, zoom: 0.83 },
  { x: 11.71, y: 9.07, zoom: 2.29 },
  { x: -4.43, y: -12.67, zoom: 3.71 },
  { x: 21.29, y: -6.31, zoom: 0.57 },
  { x: -1.97, y: 2.43, zoom: 0.3 },
  { x: 7.77, y: 3.33, zoom: 4.13 },
];

/**
 * Moves the camera, steps a frame and measures it in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions".
 */
const poseAndMeasure = (
  page: Page,
  pose: CameraPose,
): Promise<TilemapTextureEdgesMeasurement> =>
  page.evaluate(({ x, y, zoom }) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setCamera(x, y, zoom);
    scene.step();

    return scene.measure();
  }, pose);

const setFilter = (page: Page, filter: TextureFilter): Promise<void> =>
  page.evaluate((textureFilter) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setFilter(textureFilter);
  }, filter);

/**
 * Asserts a frame drew the block of tiles as one solid color: no pixel
 * inside it shows the contrasting color around the tile in the sheet, or
 * any blend towards it.
 */
const expectNoContrast = (
  measurement: TilemapTextureEdgesMeasurement,
): void => {
  expect(measurement.tileDrew).toBe(true);
  expect(measurement.pixels).toBeGreaterThan(1000);
  expect(measurement.contrastPixels).toBe(0);
  expect(measurement.mismatchedPixels).toBe(0);
};

test.beforeEach(async ({ page }) => {
  await test.step('load the tilemap-texture-edges scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tilemap-texture-edges');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

for (const filter of ['nearest', 'linear'] as const) {
  test(`tiles from a '${filter}' atlas never show the atlas cells around them at fractional camera positions and zooms`, async ({
    page,
  }) => {
    await test.step(`give the layer a '${filter}' atlas`, () =>
      setFilter(page, filter));

    const frames =
      await test.step('move the camera through fractional positions and zooms, a frame each', async () => {
        const measurements: TilemapTextureEdgesMeasurement[] = [];

        // Sequential by design: each pose is its own frame.
        for (const pose of cameraPoses) {
          // eslint-disable-next-line no-await-in-loop
          measurements.push(await poseAndMeasure(page, pose));
        }

        return measurements;
      });

    await test.step('assert every frame drew the block as one solid color', () => {
      frames.forEach((measurement, index) => {
        expect(measurement.filter).toBe(filter);
        expect(measurement.zoom).toBe(cameraPoses[index].zoom);
        expectNoContrast(measurement);
      });
    });
  });
}
