import { expect, test } from '@playwright/test';
import type {
  IsometricCellName,
  IsometricOverlapMeasurement,
  IsometricOverlapSceneHandle,
  IsometricPixel,
  IsometricTileColor,
} from '../fixtures/scenes/tilemap-isometric-overlap.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = IsometricOverlapSceneHandle;
type Page = import('@playwright/test').Page;

/** A vertical run of pixels, in device pixels from the top, inclusive. */
interface PixelExtent {
  top: number;
  bottom: number;
}

type Paint = readonly [IsometricCellName, IsometricTileColor | null];

/**
 * Paints cells, steps one frame and reads the canvas in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions" for why
 * `step()` and the read must happen in one `page.evaluate` call. The frame
 * right after the edit is the one measured, so an edited tile has to show
 * on the next frame.
 */
const paintAndMeasure = (
  page: Page,
  paints: readonly Paint[],
): Promise<IsometricOverlapMeasurement> =>
  page.evaluate((cellPaints) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    for (const [cell, color] of cellPaints) {
      scene.paint(cell, color);
    }

    scene.step();

    return scene.measure();
  }, paints);

/** The first and last pixel down the column that show `kind`. */
const extentOf = (
  column: readonly IsometricPixel[],
  kind: IsometricPixel,
): PixelExtent | null => {
  const top = column.indexOf(kind);

  return top === -1 ? null : { top, bottom: column.lastIndexOf(kind) };
};

const requiredExtent = (
  column: readonly IsometricPixel[],
  kind: IsometricPixel,
): PixelExtent => {
  const extent = extentOf(column, kind);

  if (!extent) {
    throw new Error(`Expected ${kind} on the sampled column.`);
  }

  return extent;
};

// Edges land partway through pixels, so a measured edge can be a pixel
// either side of the predicted one.
const edgeTolerance = 2;

/**
 * Asserts that a run of pixels starts and ends where the camera puts two
 * world Y positions: `top` at the first's row and `bottom` just above the
 * second's.
 */
const expectSpans = (
  extent: PixelExtent,
  predictedTop: number,
  predictedBottom: number,
): void => {
  expect(Math.abs(extent.top - predictedTop)).toBeLessThanOrEqual(
    edgeTolerance,
  );
  expect(Math.abs(extent.bottom + 1 - predictedBottom)).toBeLessThanOrEqual(
    edgeTolerance,
  );
};

/**
 * Asserts the tile in front covers the bottom half of the one behind it:
 * the back tile's color shows from its top (world y `-32`) down to the
 * front tile's top (`0`), and the front tile's from there to its bottom
 * (`64`).
 */
const expectFrontCoversBack = (
  measurement: IsometricOverlapMeasurement,
  backColor: IsometricTileColor,
  frontColor: IsometricTileColor,
): void => {
  const { column, predictedRows } = measurement;
  const back = requiredExtent(column, backColor);
  const front = requiredExtent(column, frontColor);

  expectSpans(back, predictedRows[-32], predictedRows[0]);
  expectSpans(front, predictedRows[0], predictedRows[64]);
  expect(Math.abs(front.top - (back.bottom + 1))).toBeLessThanOrEqual(
    edgeTolerance,
  );
};

test.beforeEach(async ({ page }) => {
  await test.step('load the tilemap-isometric-overlap scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tilemap-isometric-overlap');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

test('a two-cell-tall isometric tile in a higher row covers the tile in the row behind it', async ({
  page,
}) => {
  const backOnly = await test.step('paint only the tile in row 0 red', () =>
    paintAndMeasure(page, [['back', 'red']]));

  const hiddenRed = requiredExtent(backOnly.column, 'red');

  await test.step('assert the whole red tile shows', () => {
    expect(extentOf(backOnly.column, 'blue')).toBeNull();
    expectSpans(
      hiddenRed,
      backOnly.predictedRows[-32],
      backOnly.predictedRows[32],
    );
  });

  const withFront =
    await test.step('paint the tall tile in row 1, in front of it, blue', () =>
      paintAndMeasure(page, [['front', 'blue']]));

  await test.step('assert blue covers the bottom half of red', () => {
    const red = requiredExtent(withFront.column, 'red');

    expect(red.bottom).toBeLessThan(hiddenRed.bottom - 20);
    expect(Math.abs(red.top - hiddenRed.top)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expectFrontCoversBack(withFront, 'red', 'blue');
  });

  const swapped =
    await test.step('swap the colors: row 0 blue, row 1 red', () =>
      paintAndMeasure(page, [
        ['back', 'blue'],
        ['front', 'red'],
      ]));

  await test.step('assert the front tile still wins, now in red', () => {
    expectFrontCoversBack(swapped, 'blue', 'red');
  });

  const withBehind =
    await test.step('paint a green tile in a new chunk, in row -1 behind both', () =>
      paintAndMeasure(page, [['behind', 'green']]));

  await test.step('assert the new chunk drew on the next frame, behind the existing chunk', () => {
    expect(swapped.chunkCount).toBe(1);
    expect(withBehind.chunkCount).toBe(2);

    // The green tile's image spans world y [-64, 0], but the tile in row 0
    // covers its bottom half, from y = -32.
    const green = requiredExtent(withBehind.column, 'green');

    expectSpans(
      green,
      withBehind.predictedRows[-64],
      withBehind.predictedRows[-32],
    );
    expectFrontCoversBack(withBehind, 'blue', 'red');
  });

  const cleared =
    await test.step('clear the tile in row 0, between the other two', () =>
      paintAndMeasure(page, [['back', null]]));

  await test.step('assert the green tile shows down to where the red one covers it', () => {
    expect(extentOf(cleared.column, 'blue')).toBeNull();

    const green = requiredExtent(cleared.column, 'green');
    const red = requiredExtent(cleared.column, 'red');

    expectSpans(green, cleared.predictedRows[-64], cleared.predictedRows[0]);
    expectSpans(red, cleared.predictedRows[0], cleared.predictedRows[64]);
  });
});
