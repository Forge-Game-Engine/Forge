import { expect, test } from '@playwright/test';
import type {
  HierarchicalDrawOrderMeasurement,
  HierarchicalDrawOrderSceneHandle,
} from '../fixtures/scenes/hierarchical-draw-order.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = HierarchicalDrawOrderSceneHandle;

/**
 * Sets the flame's draw order, steps one frame and samples the canvas in
 * the same task - see AGENTS.md's "Be wary of pixel-level rendering
 * assertions" for why `step()` and the read must happen in one
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  flameOrder: number,
  flameBehindParent: boolean = false,
): Promise<HierarchicalDrawOrderMeasurement> =>
  page.evaluate(
    ([order, behindParent]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setFlameDrawOrder(order, behindParent);
      scene.step();

      return scene.measure();
    },
    [flameOrder, flameBehindParent] as const,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=hierarchical-draw-order');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test("a child's draw order moves it behind everything at its parent's level, every frame, with no per-frame code", async ({
  page,
}) => {
  for (let frame = 0; frame < 3; frame++) {
    const behind = await captureMeasurement(page, -1);

    expect(behind.flameOrder).toBe(-1);
    expect(behind.shipAndFlame).toBe('ship');
    expect(behind.rockAndFlame).toBe('rock');
  }

  const inFront = await captureMeasurement(page, 0);

  expect(inFront.flameOrder).toBe(0);
  expect(inFront.shipAndFlame).toBe('flame');
  expect(inFront.rockAndFlame).toBe('flame');
});

test('a child with behindParent draws just behind its parent, in front of what its parent is in front of', async ({
  page,
}) => {
  for (let frame = 0; frame < 3; frame++) {
    const behindShip = await captureMeasurement(page, 0, true);

    expect(behindShip.flameBehindParent).toBe(true);
    expect(behindShip.shipAndFlame).toBe('ship');
    expect(behindShip.rockAndFlame).toBe('flame');
  }
});
