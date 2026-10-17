import { expect, Page, test } from '@playwright/test';
import type {
  YSortUnitsMeasurement,
  YSortUnitsSceneHandle,
} from '../fixtures/scenes/y-sort-units.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = YSortUnitsSceneHandle;

/**
 * Moves the character, steps one frame and samples the canvas in the same
 * task - see AGENTS.md's "Be wary of pixel-level rendering assertions" for
 * why `step()` and the read must happen in one `page.evaluate` call.
 */
const captureMeasurement = (
  page: Page,
  characterY: number,
  lowerWallSortOrigin: number = 0,
): Promise<YSortUnitsMeasurement> =>
  page.evaluate(
    ([y, ySortOrigin]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setCharacterY(y);
      scene.setLowerWallSortOrigin(ySortOrigin);
      scene.step();

      return scene.measure();
    },
    [characterY, lowerWallSortOrigin] as const,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=y-sort-units');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test("a root character sorts against each wall under a ySortChildren level by the wall's own Y", async ({
  page,
}) => {
  const above = await test.step('character above both walls', () =>
    captureMeasurement(page, -2));

  expect(above.characterY).toBe(-2);
  expect(above.atUpperWall).toBe('upperWall');
  expect(above.atLowerWall).toBe('lowerWall');

  const between = await test.step('character between the walls', () =>
    captureMeasurement(page, 0));

  expect(between.characterY).toBe(0);
  expect(between.atUpperWall).toBe('character');
  expect(between.atLowerWall).toBe('lowerWall');

  const below = await test.step('character below both walls', () =>
    captureMeasurement(page, 2));

  expect(below.characterY).toBe(2);
  expect(below.atUpperWall).toBe('character');
  expect(below.atLowerWall).toBe('character');
});

test("a wall's ySortOrigin moves the line the character sorts against", async ({
  page,
}) => {
  const atCentre = await test.step('lower wall sorted at its centre', () =>
    captureMeasurement(page, 0));

  expect(atCentre.atLowerWall).toBe('lowerWall');

  // Moves the lower wall's sort line from Y 1 up to Y -1, above the
  // character.
  const raised = await test.step('lower wall sorted above the character', () =>
    captureMeasurement(page, 0, -2));

  expect(raised.atLowerWall).toBe('character');
});
