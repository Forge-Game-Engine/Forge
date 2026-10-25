import { expect, Page, test } from '@playwright/test';
import type {
  SleepingStackMeasurement,
  SleepingStackSceneHandle,
} from '../fixtures/scenes/physics-sleeping-stack.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = SleepingStackSceneHandle;

// Five seconds of simulation, far more than the column needs to land,
// settle and rest for the sleep system's half a second.
const maxStepsToSleep = 300;

/**
 * Steps `count` frames and measures the last one in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions" for why `step()`
 * and the read must happen in one `page.evaluate` call.
 */
const stepAndMeasure = (
  page: Page,
  count: number = 1,
): Promise<SleepingStackMeasurement> =>
  page.evaluate((steps) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    for (let i = 0; i < steps; i++) {
      scene.step();
    }

    return scene.measure();
  }, count);

/** Steps until every box sleeps, then measures that frame. */
const sleepAndMeasure = (page: Page): Promise<SleepingStackMeasurement> =>
  page.evaluate((maxSteps) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    if (scene.stepUntilAsleep(maxSteps) === -1) {
      throw new Error(`The column didn't fall asleep in ${maxSteps} steps.`);
    }

    return scene.measure();
  }, maxStepsToSleep);

/**
 * The column's on-screen scale, measured from a frame rather than assumed:
 * its rendered height over the height its boxes' `position.world` spans.
 */
const pixelsPerWorldUnit = (measurement: SleepingStackMeasurement): number => {
  const { bounds, worldY } = measurement;
  const worldHeight = worldY[0] - worldY[worldY.length - 1] + 1;

  return (bounds!.bottom - bounds!.top) / worldHeight;
};

/**
 * Asserts that the rendered column moved between two frames by what the
 * bottom and top boxes' `position.world` predict. A few pixels of tolerance
 * covers antialiased edges and rounding to whole pixels.
 */
const expectColumnMovedAsPredicted = (
  before: SleepingStackMeasurement,
  after: SleepingStackMeasurement,
): void => {
  const scale = pixelsPerWorldUnit(before);
  const last = before.worldY.length - 1;
  const predictedTopShift = (after.worldY[last] - before.worldY[last]) * scale;
  const predictedBottomShift = (after.worldY[0] - before.worldY[0]) * scale;

  expect(after.bounds).not.toBeNull();
  expect(after.bounds!.top - before.bounds!.top).toBeGreaterThan(
    predictedTopShift - 3,
  );
  expect(after.bounds!.top - before.bounds!.top).toBeLessThan(
    predictedTopShift + 3,
  );
  expect(after.bounds!.bottom - before.bounds!.bottom).toBeGreaterThan(
    predictedBottomShift - 3,
  );
  expect(after.bounds!.bottom - before.bounds!.bottom).toBeLessThan(
    predictedBottomShift + 3,
  );
};

test.beforeEach(async ({ page }) => {
  let pageError: Error | undefined;

  page.once('pageerror', (error) => {
    pageError = error;
  });

  await page.goto('/?scene=physics-sleeping-stack');

  try {
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
  } catch (timeoutError) {
    throw pageError ?? timeoutError;
  }
});

test('a sleeping column of boxes falls when its floor is moved or removed', async ({
  page,
}) => {
  const asleep = await test.step('the column lands and falls asleep', () =>
    sleepAndMeasure(page));

  expect(asleep.bounds).not.toBeNull();
  // Three one-unit boxes, so a few dozen pixels per unit at least.
  expect(pixelsPerWorldUnit(asleep)).toBeGreaterThan(20);

  await test.step('the sleeping column stays where it is', async () => {
    const later = await stepAndMeasure(page, 60);

    expect(later.sleeping).toEqual([true, true, true]);
    expect(later.worldY).toEqual(asleep.worldY);
    expect(later.bounds).toEqual(asleep.bounds);
  });

  // A floor raised into the column, like a lift game code moves, still
  // touches it, so the column keeps every contact it fell asleep with. Only
  // the floor's recorded pose tells the sleep system it moved.
  const raised =
    await test.step('raising the floor into the column wakes it, pushes it up and lets it sleep again', async () => {
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).moveFloor(-0.25),
      );

      const woken = await stepAndMeasure(page);

      expect(woken.sleeping).toEqual([false, false, false]);
      // Pushed out of the floor's new pose on the tick it moved.
      expect(woken.velocityY[0]).toBeLessThan(0);

      return sleepAndMeasure(page);
    });

  expect(raised.worldY[0] - asleep.worldY[0]).toBeCloseTo(-0.25, 1);
  expectColumnMovedAsPredicted(asleep, raised);

  await test.step('removing the floor wakes the column on the next tick, and it falls', async () => {
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).removeFloor(),
    );

    const woken = await stepAndMeasure(page);

    expect(woken.sleeping).toEqual([false, false, false]);
    expect(woken.velocityY.every((velocity) => velocity > 0)).toBe(true);

    // Half a second of free fall: about a unit and a quarter.
    const fallen = await stepAndMeasure(page, 30);

    expect(fallen.worldY[0] - raised.worldY[0]).toBeGreaterThan(1);
    expectColumnMovedAsPredicted(raised, fallen);
  });
});
