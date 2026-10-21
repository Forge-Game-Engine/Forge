import { expect, test } from '@playwright/test';
import type {
  CharacterSpot,
  YSortedWallsMeasurement,
  YSortedWallsPixel,
  YSortedWallsSceneHandle,
} from '../fixtures/scenes/tilemap-y-sorted-walls.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = YSortedWallsSceneHandle;
type Page = import('@playwright/test').Page;

/** A vertical run of pixels, in device pixels from the top, inclusive. */
interface PixelExtent {
  top: number;
  bottom: number;
}

/**
 * Places the character, steps one frame and reads the canvas in the same
 * task - see AGENTS.md's "Be wary of pixel-level rendering assertions" for
 * why `step()` and the read must happen in one `page.evaluate` call.
 */
const placeAndMeasure = (
  page: Page,
  spot: CharacterSpot | null,
): Promise<YSortedWallsMeasurement> =>
  page.evaluate((characterSpot) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.placeCharacter(characterSpot);
    scene.step();

    return scene.measure();
  }, spot);

/** The first and last pixel down the column that show `kind`. */
const extentOf = (
  column: readonly YSortedWallsPixel[],
  kind: YSortedWallsPixel,
): PixelExtent | null => {
  const top = column.indexOf(kind);

  return top === -1 ? null : { top, bottom: column.lastIndexOf(kind) };
};

const requiredExtent = (
  column: readonly YSortedWallsPixel[],
  kind: YSortedWallsPixel,
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

const expectNear = (measured: number, predicted: number): void => {
  expect(Math.abs(measured - predicted)).toBeLessThanOrEqual(edgeTolerance);
};

test.beforeEach(async ({ page }) => {
  await test.step('load the tilemap-y-sorted-walls scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tilemap-y-sorted-walls');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

test('a character walking past a y-sorted wall is hidden behind it, then drawn over it', async ({
  page,
}) => {
  const hidden = await test.step('hide the character', () =>
    placeAndMeasure(page, null));

  const wall = requiredExtent(hidden.column, 'wall');

  await test.step('assert the whole wall shows, and the wall layer draws in one call', () => {
    expect(extentOf(hidden.column, 'character')).toBeNull();
    expectNear(wall.top, hidden.predictedRows[-32]);
    expect(hidden.wallRowCount).toBe(3);
    expect(hidden.meshDrawCalls).toBe(hidden.floorMeshCount + 1);
  });

  const behind =
    await test.step('stand the character on the row behind the wall', () =>
      placeAndMeasure(page, 'behind'));

  await test.step('assert the wall covers the character', () => {
    // The wall is unchanged; only the character's head, above the wall,
    // shows.
    expect(requiredExtent(behind.column, 'wall')).toEqual(wall);

    const character = requiredExtent(behind.column, 'character');

    expectNear(character.top, behind.predictedRows[-48]);
    expect(Math.abs(character.bottom + 1 - wall.top)).toBeLessThanOrEqual(
      edgeTolerance,
    );

    // The character sorts between two of the wall layer's rows.
    expect(behind.meshDrawCalls).toBe(hidden.meshDrawCalls + 1);
  });

  const inFront =
    await test.step('step the character onto the row in front of the wall', () =>
      placeAndMeasure(page, 'inFront'));

  await test.step('assert the character covers the wall', () => {
    const character = requiredExtent(inFront.column, 'character');
    const coveredWall = requiredExtent(inFront.column, 'wall');

    // The character spans world y [-16, 32]: the wall's bottom, down to
    // where it ended in the hidden frame, is now the character's.
    expectNear(character.top, inFront.predictedRows[-16]);
    expect(Math.abs(character.bottom - wall.bottom)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(coveredWall.top).toBe(wall.top);
    expect(coveredWall.bottom).toBeLessThan(wall.bottom - 20);
    expect(
      Math.abs(coveredWall.bottom + 1 - character.top),
    ).toBeLessThanOrEqual(edgeTolerance);
    expect(inFront.meshDrawCalls).toBe(hidden.meshDrawCalls + 1);
  });

  const pastEveryRow =
    await test.step('walk the character in front of every wall row', () =>
      placeAndMeasure(page, 'inFrontOfEveryRow'));

  await test.step('assert the wall layer draws in one call again', () => {
    expect(requiredExtent(pastEveryRow.column, 'wall')).toEqual(wall);
    expect(pastEveryRow.meshDrawCalls).toBe(hidden.meshDrawCalls);
  });
});
