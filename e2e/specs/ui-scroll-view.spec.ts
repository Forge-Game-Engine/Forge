import { expect, test } from '@playwright/test';
import type { UiScrollViewSceneHandle } from '../fixtures/scenes/ui-scroll-view.js';

type Hooks = UiScrollViewSceneHandle;
type Page = import('@playwright/test').Page;

/** Steps one frame and measures the landmark item on the rendered canvas. */
const capture = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      offsetY: scene.offsetY,
      landmarkInvokeCount: scene.landmarkInvokeCount,
      viewportTop: scene.viewportTop,
      landmark: scene.measureLandmark(),
    };
  });

/** Steps a few frames so the list is laid out and drawn. */
const settle = async (page: Page) => {
  for (let frame = 0; frame < 3; frame++) {
    // eslint-disable-next-line no-await-in-loop
    await capture(page);
  }

  return capture(page);
};

const viewportCenter = (page: Page) =>
  page.evaluate(
    () => (window.__forgeTestHooks as unknown as Hooks).viewportCenter,
  );

test.describe('ui scroll view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scene=ui-scroll-view');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
  });

  test('clicking an item invokes it', async ({ page }) => {
    const before = await settle(page);

    expect(before.landmark).not.toBeNull();

    const center = await viewportCenter(page);
    const landmarkCenterY =
      (before.landmark!.top + before.landmark!.bottom) / 2 - 300 + center.y;

    await page.mouse.click(center.x, landmarkCenterY);

    expect((await settle(page)).landmarkInvokeCount).toBe(1);
  });

  test('dragging an item scrolls the list with the pointer instead of invoking it', async ({
    page,
  }) => {
    const before = await settle(page);
    const center = await viewportCenter(page);
    const startY = (before.landmark!.top + before.landmark!.bottom) / 2 - 300;

    await page.mouse.move(center.x, center.y + startY);
    await page.mouse.down();
    await capture(page);
    // Past the drag threshold: the drag starts here.
    await page.mouse.move(center.x, center.y + startY - 20);
    await capture(page);
    await page.mouse.move(center.x, center.y + startY - 120);

    const dragged = await capture(page);

    expect(dragged.offsetY).toBeCloseTo(100, 0);

    // The layout places the content on the next frame.
    const drawn = await capture(page);

    // Relative, same-run measurement: the rendered item moved up as far as
    // the pointer did.
    expect(before.landmark!.bottom - drawn.landmark!.bottom).toBeGreaterThan(
      97,
    );
    expect(before.landmark!.bottom - drawn.landmark!.bottom).toBeLessThan(103);

    await page.mouse.up();

    expect((await settle(page)).landmarkInvokeCount).toBe(0);
  });

  test('the wheel scrolls the list and the viewport clips it', async ({
    page,
  }) => {
    const before = await settle(page);
    const center = await viewportCenter(page);

    await page.mouse.move(center.x, center.y);
    await capture(page);
    await page.mouse.wheel(0, 120);

    const wheeled = await settle(page);

    expect(wheeled.offsetY).toBeCloseTo(120, 0);
    expect(before.landmark!.bottom - wheeled.landmark!.bottom).toBeGreaterThan(
      117,
    );
    expect(before.landmark!.bottom - wheeled.landmark!.bottom).toBeLessThan(
      123,
    );

    // The landmark's top 30 pixels now lie above the viewport.
    await page.mouse.wheel(0, 150);

    const clipped = await settle(page);
    const visibleHeight = clipped.landmark!.bottom - clipped.landmark!.top;

    expect(clipped.offsetY).toBeCloseTo(270, 0);
    expect(clipped.landmark!.top).toBeGreaterThanOrEqual(
      clipped.viewportTop - 1,
    );
    expect(visibleHeight).toBeGreaterThan(25);
    expect(visibleHeight).toBeLessThan(35);
  });
});
