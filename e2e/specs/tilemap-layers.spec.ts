import { expect, test } from '@playwright/test';
import type {
  PixelBounds,
  TilemapLayersMeasurement,
  TilemapLayersPixel,
  TilemapLayersSceneHandle,
} from '../fixtures/scenes/tilemap-layers.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = TilemapLayersSceneHandle;
type Page = import('@playwright/test').Page;

/** A horizontal run of pixels, in device pixels from the left, inclusive. */
interface PixelExtent {
  left: number;
  right: number;
}

/**
 * Sets the sprite's visibility and draw order, steps one frame and reads
 * the canvas in the same task - see AGENTS.md's "Be wary of pixel-level
 * rendering assertions" for why `step()` and the read must happen in one
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: Page,
  spriteVisible: boolean,
  spriteOrder: number,
): Promise<TilemapLayersMeasurement> =>
  page.evaluate(
    ([visible, order]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setSpriteVisible(visible);
      scene.setSpriteOrder(order);
      scene.step();

      return scene.measure();
    },
    [spriteVisible, spriteOrder] as const,
  );

/** Pans the camera by `(x, y)` world units, steps a frame and reads it. */
const panAndMeasure = (
  page: Page,
  x: number,
  y: number,
): Promise<TilemapLayersMeasurement> =>
  page.evaluate(
    ([panX, panY]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.panCamera(panX, panY);
      scene.step();

      return scene.measure();
    },
    [x, y] as const,
  );

/** The first and last pixel along the row that show `kind`. */
const extentOf = (
  row: readonly TilemapLayersPixel[],
  kind: TilemapLayersPixel,
): PixelExtent | null => {
  const left = row.indexOf(kind);

  return left === -1 ? null : { left, right: row.lastIndexOf(kind) };
};

const requiredExtent = (
  row: readonly TilemapLayersPixel[],
  kind: TilemapLayersPixel,
): PixelExtent => {
  const extent = extentOf(row, kind);

  if (!extent) {
    throw new Error(`Expected the ${kind} on the sampled row.`);
  }

  return extent;
};

/** How many pixels in `[from, to]` along the row show `kind`. */
const countBetween = (
  row: readonly TilemapLayersPixel[],
  kind: TilemapLayersPixel,
  from: number,
  to: number,
): number =>
  row.slice(Math.round(from), Math.round(to) + 1).filter((p) => p === kind)
    .length;

const requiredBounds = (bounds: PixelBounds | null): PixelBounds => {
  if (!bounds) {
    throw new Error('Expected the landmark tile on the canvas.');
  }

  return bounds;
};

// Edges land partway through pixels, so a measured edge can be a pixel
// either side of the predicted one.
const edgeTolerance = 2;

test.beforeEach(async ({ page }) => {
  await test.step('load the tilemap-layers scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tilemap-layers');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

test('a sprite between two tilemap layers draws over the background layer and under the foreground layer', async ({
  page,
}) => {
  const hidden = await test.step('render the layers without the sprite', () =>
    captureMeasurement(page, false, 0));

  const { predicted } = hidden;

  await test.step('assert both layers drew where the camera puts them', () => {
    expect(extentOf(hidden.row, 'sprite')).toBeNull();

    const foreground = requiredExtent(hidden.row, 'foreground');

    expect(
      Math.abs(foreground.left - predicted.foregroundLeft),
    ).toBeLessThanOrEqual(edgeTolerance);
    expect(
      Math.abs(foreground.right + 1 - predicted.foregroundRight),
    ).toBeLessThanOrEqual(edgeTolerance);

    // The background layer fills the row where the sprite will be.
    const spriteSpanOverBackground =
      predicted.foregroundLeft - predicted.spriteLeft - 2 * edgeTolerance;

    expect(spriteSpanOverBackground).toBeGreaterThan(100);
    expect(
      countBetween(
        hidden.row,
        'background',
        predicted.spriteLeft + edgeTolerance,
        predicted.foregroundLeft - edgeTolerance,
      ),
    ).toBeGreaterThanOrEqual(spriteSpanOverBackground);
  });

  const between = await test.step('show the sprite between the layers', () =>
    captureMeasurement(page, true, 0));

  await test.step('assert the sprite covers the background layer, and the foreground layer covers the sprite', () => {
    const sprite = requiredExtent(between.row, 'sprite');
    const foreground = requiredExtent(between.row, 'foreground');
    const hiddenForeground = requiredExtent(hidden.row, 'foreground');

    // Over the background layer, the sprite shows instead of it.
    expect(Math.abs(sprite.left - predicted.spriteLeft)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(
      countBetween(
        between.row,
        'background',
        predicted.spriteLeft + edgeTolerance,
        predicted.foregroundLeft - edgeTolerance,
      ),
    ).toBe(0);

    // Under the foreground layer, the sprite is hidden: its visible right
    // end stops where the foreground layer starts, well short of its own
    // right edge, and the foreground layer looks as it did without it.
    expect(sprite.right).toBeLessThan(predicted.spriteRight - 20);
    expect(Math.abs(sprite.right + 1 - foreground.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(
      Math.abs(foreground.left - hiddenForeground.left),
    ).toBeLessThanOrEqual(edgeTolerance);
    expect(
      Math.abs(foreground.right - hiddenForeground.right),
    ).toBeLessThanOrEqual(edgeTolerance);
  });

  const inFront =
    await test.step('give the sprite a draw order above both layers', () =>
      captureMeasurement(page, true, 1));

  await test.step('assert the sprite now covers the foreground layer too', () => {
    const sprite = requiredExtent(inFront.row, 'sprite');
    const foreground = requiredExtent(inFront.row, 'foreground');

    expect(
      Math.abs(sprite.right + 1 - predicted.spriteRight),
    ).toBeLessThanOrEqual(edgeTolerance);
    expect(Math.abs(foreground.left - (sprite.right + 1))).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(foreground.left).toBeGreaterThan(predicted.foregroundLeft + 20);
  });
});

test('panning the camera moves a tilemap layer on screen by the pan times the pixels per unit and zoom', async ({
  page,
}) => {
  const before = await test.step('render a frame', () =>
    captureMeasurement(page, true, 0));

  // Several frames, so the pan is watchable in the recorded video. The
  // fractional amounts move the tiles by fractional numbers of pixels.
  const pan = { x: 4.05, y: 2.525 };
  const frames = 10;

  const after =
    await test.step('pan the camera right and down over several frames', async () => {
      let measurement = before;

      for (let frame = 0; frame < frames; frame++) {
        // Sequential by design: each frame pans from where the last left off.
        // eslint-disable-next-line no-await-in-loop
        measurement = await panAndMeasure(page, pan.x, pan.y);
      }

      return measurement;
    });

  await test.step('assert the landmark tile moved by the pan times the pixels per unit and zoom', () => {
    const panned = {
      x: after.cameraPosition.x - before.cameraPosition.x,
      y: after.cameraPosition.y - before.cameraPosition.y,
    };

    expect(panned.x).toBeCloseTo(pan.x * frames);
    expect(panned.y).toBeCloseTo(pan.y * frames);

    const pixelsPerUnit = after.devicePixelsPerUnitAtZoomOne * after.zoom;
    // Moving the camera right and down moves the world left and up on
    // screen.
    const expected = {
      x: -panned.x * pixelsPerUnit,
      y: -panned.y * pixelsPerUnit,
    };
    const landmarkBefore = requiredBounds(before.landmark);
    const landmarkAfter = requiredBounds(after.landmark);

    expect(expected.x).toBeLessThan(-50);
    expect(expected.y).toBeLessThan(-30);

    for (const edge of ['left', 'right'] as const) {
      expect(
        Math.abs(landmarkAfter[edge] - landmarkBefore[edge] - expected.x),
      ).toBeLessThanOrEqual(edgeTolerance);
    }

    for (const edge of ['top', 'bottom'] as const) {
      expect(
        Math.abs(landmarkAfter[edge] - landmarkBefore[edge] - expected.y),
      ).toBeLessThanOrEqual(edgeTolerance);
    }

    // The tile kept its size: a cell is 32 world units.
    const size = 32 * pixelsPerUnit;

    expect(
      Math.abs(landmarkAfter.right + 1 - landmarkAfter.left - size),
    ).toBeLessThanOrEqual(edgeTolerance);
    expect(
      Math.abs(landmarkAfter.bottom + 1 - landmarkAfter.top - size),
    ).toBeLessThanOrEqual(edgeTolerance);
  });
});
