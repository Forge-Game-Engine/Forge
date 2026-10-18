import { expect, test } from '@playwright/test';
import type {
  SiblingIndexDrawOrderMeasurement,
  SiblingIndexDrawOrderSceneHandle,
} from '../fixtures/scenes/sibling-index-draw-order.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = SiblingIndexDrawOrderSceneHandle;

/**
 * Optionally moves the inserted child, steps one frame and samples the
 * canvas in the same task - see AGENTS.md's "Be wary of pixel-level
 * rendering assertions" for why `step()` and the read must happen in one
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  siblingIndex: number | null,
): Promise<SiblingIndexDrawOrderMeasurement> =>
  page.evaluate((index) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    if (index !== null) {
      scene.setInsertedSiblingIndex(index);
    }

    scene.step();

    return scene.measure();
  }, siblingIndex);

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=sibling-index-draw-order');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test('a child moved between two siblings with setSiblingIndex draws between them', async ({
  page,
}) => {
  const appended = await captureMeasurement(page, null);

  expect(appended.insertedSiblingIndex).toBe(2);
  expect(appended.leftAndInserted).toBe('inserted');
  expect(appended.rightAndInserted).toBe('inserted');

  for (let frame = 0; frame < 3; frame++) {
    const between = await captureMeasurement(page, 1);

    expect(between.insertedSiblingIndex).toBe(1);
    expect(between.leftAndInserted).toBe('inserted');
    expect(between.rightAndInserted).toBe('right');
  }

  const first = await captureMeasurement(page, 0);

  expect(first.insertedSiblingIndex).toBe(0);
  expect(first.leftAndInserted).toBe('left');
  expect(first.rightAndInserted).toBe('right');
});
