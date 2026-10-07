import { expect, test } from '@playwright/test';
import type {
  ContextLossMeasurement,
  ContextLossSceneHandle,
} from '../fixtures/scenes/webgl-context-loss.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = ContextLossSceneHandle;
type Page = import('@playwright/test').Page;

/** Steps a few frames and measures the last one, in the same task. */
const drawAndMeasure = (page: Page): Promise<ContextLossMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    for (let frame = 0; frame < 3; frame++) {
      scene.step();
    }

    return scene.measure();
  });

test.describe('WebGL context loss', () => {
  test('keeps running while the context is lost and draws the same frame once it is restored', async ({
    page,
  }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/?scene=webgl-context-loss');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);

    const before = await drawAndMeasure(page);

    expect(before.green).not.toBeNull();
    expect(before.red).toBeNull();

    await page.evaluate(() => {
      (window.__forgeTestHooks as unknown as Hooks).loseContext();
    });
    await page.waitForFunction(
      () =>
        (window.__forgeTestHooks as unknown as Hooks).eventCounts().lost === 1,
    );

    // The game keeps updating while the context is lost, and creating a
    // texture, a material from shaders nothing has linked yet, and a sprite
    // using them doesn't throw.
    const whileLost = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();
      scene.addRedSprite();
      scene.step();

      return scene.isContextLost();
    });

    expect(whileLost).toBe(true);

    await page.evaluate(() => {
      (window.__forgeTestHooks as unknown as Hooks).restoreContext();
    });
    await page.waitForFunction(
      () =>
        (window.__forgeTestHooks as unknown as Hooks).eventCounts().restored ===
        1,
    );

    const after = await drawAndMeasure(page);

    // The sprite drawn before the loss is drawn again, in the same place
    // and at the same size: its texture was re-uploaded from its canvas,
    // and the programs, render targets and quad were rebuilt.
    expect(after.green).toEqual(before.green);

    // The sprite created while the context was lost is drawn too, at the
    // same size, mirrored across the canvas's center.
    expect(after.red).not.toBeNull();
    expect(after.red?.width).toBe(before.green?.width);
    expect(after.red?.height).toBe(before.green?.height);
    expect(after.red?.top).toBe(before.green?.top);

    expect(pageErrors).toEqual([]);
  });
});
