import { expect, test } from '@playwright/test';
import type {
  TilemapAnimatedTilesMeasurement,
  TilemapAnimatedTilesSceneHandle,
} from '../fixtures/scenes/tilemap-animated-tiles.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = TilemapAnimatedTilesSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Advances the scene's time by `frames` of the animated tile's frame
 * durations, one step per frame duration, then reads the canvas in the same
 * task - see AGENTS.md's "Be wary of pixel-level rendering assertions" for
 * why the last `step()` and the read must happen in one `page.evaluate`
 * call.
 */
const advanceAndMeasure = (
  page: Page,
  frames: number,
): Promise<TilemapAnimatedTilesMeasurement> =>
  page.evaluate((frameCount) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    for (let i = 0; i < frameCount; i++) {
      scene.step(scene.frameDurationMilliseconds);
    }

    if (frameCount === 0) {
      scene.step();
    }

    return scene.measure();
  }, frames);

test.beforeEach(async ({ page }) => {
  await test.step('load the tilemap-animated-tiles scene', async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=tilemap-animated-tiles');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });
});

test('an animated tile shows its next frame after one frame’s duration, and the static tiles stay as they are', async ({
  page,
}) => {
  const first = await test.step('render the first frame', () =>
    advanceAndMeasure(page, 0));

  await test.step('assert the animated tile shows one of its frames', () => {
    expect(['firstFrame', 'secondFrame']).toContain(first.animatedCell);
    expect(first.landmarkCell).toBe('landmark');
  });

  const second = await test.step('advance by one frame duration', () =>
    advanceAndMeasure(page, 1));

  // Both frames last as long, so after one frame duration the tile shows
  // the other frame whatever the clock's starting phase.
  const otherFrame =
    first.animatedCell === 'firstFrame' ? 'secondFrame' : 'firstFrame';

  await test.step('assert the animated tile switched frame and nothing else changed', () => {
    expect(second.timeInMilliseconds).toBeCloseTo(
      first.timeInMilliseconds + 200,
      3,
    );
    expect(second.animatedCell).toBe(otherFrame);

    // The whole cell changed color: the pixels the first frame covered now
    // show the second.
    expect(second.counts[first.animatedCell]).toBe(0);
    expect(second.counts[otherFrame]).toBe(first.counts[first.animatedCell]);
    expect(second.counts.landmark).toBe(first.counts.landmark);
    expect(second.counts.background).toBe(first.counts.background);
    expect(second.landmarkCell).toBe('landmark');
  });

  const third = await test.step('advance by another frame duration', () =>
    advanceAndMeasure(page, 1));

  await test.step('assert the animation wrapped back to the first frame', () => {
    expect(third.animatedCell).toBe(first.animatedCell);
    expect(third.counts).toEqual(first.counts);
  });
});
