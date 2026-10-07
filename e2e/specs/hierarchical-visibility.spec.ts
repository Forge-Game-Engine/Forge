import { expect, test } from '@playwright/test';
import type {
  HierarchicalVisibilityMeasurement,
  HierarchicalVisibilitySceneHandle,
} from '../fixtures/scenes/hierarchical-visibility.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = HierarchicalVisibilitySceneHandle;

/**
 * Sets both visibilities, steps two frames (layout resolves before the
 * render system draws, so the second frame shows the settled layout) and
 * samples the canvas in the same task - see AGENTS.md's "Be wary of
 * pixel-level rendering assertions" for why `step()` and the read must
 * happen in one `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  visibility: { green: boolean; menu: boolean },
): Promise<HierarchicalVisibilityMeasurement> =>
  page.evaluate(({ green, menu }) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setGreenVisible(green);
    scene.setMenuVisible(menu);
    scene.step();
    scene.step();

    return scene.measure();
  }, visibility);

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=hierarchical-visibility');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test('hiding a row in a vertical layout group stops drawing it and moves the row below up into its place', async ({
  page,
}) => {
  const shown = await captureMeasurement(page, { green: true, menu: true });

  expect(shown.greenVisible).toBe(true);
  expect(shown.extents.red).not.toBeNull();
  expect(shown.extents.green).not.toBeNull();
  expect(shown.extents.blue).not.toBeNull();

  const hidden = await captureMeasurement(page, { green: false, menu: true });

  expect(hidden.greenVisible).toBe(false);
  expect(hidden.extents.green).toBeNull();

  // The blue row now starts where the green row started, and the red row
  // above it hasn't moved. A couple of pixels of slack covers antialiased
  // edges.
  expect(
    Math.abs(hidden.extents.blue!.top - shown.extents.green!.top),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(hidden.extents.red!.top - shown.extents.red!.top),
  ).toBeLessThanOrEqual(2);

  const shownAgain = await captureMeasurement(page, {
    green: true,
    menu: true,
  });

  expect(
    Math.abs(shownAgain.extents.blue!.top - shown.extents.blue!.top),
  ).toBeLessThanOrEqual(2);
});

test('hiding the menu hides its panel and every row under it', async ({
  page,
}) => {
  const shown = await captureMeasurement(page, { green: true, menu: true });

  expect(shown.extents.menu).not.toBeNull();

  const hidden = await captureMeasurement(page, { green: true, menu: false });

  expect(hidden.menuVisible).toBe(false);
  // The green row's own `visible` is still `true`; its hidden parent wins.
  expect(hidden.greenVisible).toBe(true);
  expect(hidden.extents.menu).toBeNull();
  expect(hidden.extents.red).toBeNull();
  expect(hidden.extents.green).toBeNull();
  expect(hidden.extents.blue).toBeNull();
});
