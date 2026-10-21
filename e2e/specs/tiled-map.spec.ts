import { expect, test } from '@playwright/test';
import type {
  TiledMapMeasurement,
  TiledMapPixelBounds,
  TiledMapSceneHandle,
} from '../fixtures/scenes/tiled-map.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = TiledMapSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Steps one frame and reads the canvas in the same task - see AGENTS.md's
 * "Be wary of pixel-level rendering assertions" for why `step()` and the
 * read must happen in one `page.evaluate` call.
 */
const captureMeasurement = (page: Page): Promise<TiledMapMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure();
  });

const requiredBounds = (
  bounds: TiledMapPixelBounds | null,
  name: string,
): TiledMapPixelBounds => {
  if (!bounds) {
    throw new Error(`Expected the ${name} tile on the canvas.`);
  }

  return bounds;
};

// Edges land partway through pixels, so a measured edge can be a pixel
// either side of the predicted one.
const edgeTolerance = 2;

test.beforeEach(async ({ page }) => {
  await test.step('load the tiled-map scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tiled-map');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

test("a loaded Tiled map's flip flags turn and mirror its tiles the way Tiled draws them", async ({
  page,
}) => {
  const measurement = await test.step('render the map', () =>
    captureMeasurement(page));

  await test.step('assert each marker sits in the corner its flags put it in', () => {
    // The marker is a 6 x 6 square in the 16 x 16 tile's top-right corner,
    // so its center is 5 units from the tile's center on each axis.
    const expectedDistance = 5 * measurement.pixelsPerUnit;
    // Unflipped, flipped X (horizontal), flipped Y (vertical) and
    // transposed (Tiled's diagonal flag), as signs of the marker's offset.
    const expectedCorners = [
      { x: 1, y: -1 },
      { x: -1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];

    measurement.markers.forEach((marker, index) => {
      const { offset } = marker;

      // The tile drew, mostly blue, with a marker a ninth of its size.
      expect(marker.bluePixels).toBeGreaterThan(marker.yellowPixels * 4);
      expect(marker.yellowPixels).toBeGreaterThan(0);

      if (!offset) {
        throw new Error(`Expected marker ${index} on the canvas.`);
      }

      expect(
        Math.abs(offset.x - expectedCorners[index].x * expectedDistance),
      ).toBeLessThanOrEqual(edgeTolerance);
      expect(
        Math.abs(offset.y - expectedCorners[index].y * expectedDistance),
      ).toBeLessThanOrEqual(edgeTolerance);
    });
  });
});

test("a Tiled layer's offset and its group's add up through the transform hierarchy", async ({
  page,
}) => {
  const measurement = await test.step('render the map', () =>
    captureMeasurement(page));

  await test.step('assert the shifted tile draws one tile lower than its twin', () => {
    const twin = requiredBounds(measurement.twin, 'twin');
    const shifted = requiredBounds(measurement.shifted, 'shifted');
    const tile = 16 * measurement.pixelsPerUnit;

    // Both tiles are a full tile in size.
    for (const bounds of [twin, shifted]) {
      expect(
        Math.abs(bounds.right + 1 - bounds.left - tile),
      ).toBeLessThanOrEqual(edgeTolerance);
      expect(
        Math.abs(bounds.bottom + 1 - bounds.top - tile),
      ).toBeLessThanOrEqual(edgeTolerance);
    }

    // Two columns to the right, and the group's 8 plus the layer's 8 down.
    expect(Math.abs(shifted.left - twin.left - 2 * tile)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(Math.abs(shifted.top - twin.top - tile)).toBeLessThanOrEqual(
      edgeTolerance,
    );
  });
});
