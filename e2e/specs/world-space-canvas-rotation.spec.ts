import { expect, test } from '@playwright/test';
import type { WorldSpaceCanvasRotationSceneHandle } from '../fixtures/scenes/world-space-canvas-rotation.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`, since every scene assigns to the same global property.
// The cast below narrows it to this spec's own scene handle type inline, so
// multiple scenes' specs can coexist in one tsc program without clashing
// over incompatible `Window` augmentations - see `camera-pan-zoom.spec.ts`.
type Hooks = WorldSpaceCanvasRotationSceneHandle;

/**
 * Advances the scene by one frame and reads back the health bar's actual
 * rendered pixel bounds in the same task - see AGENTS.md's "Be wary of
 * pixel-level rendering assertions" for why `step()` and any pixel read
 * must happen in the same `page.evaluate` call.
 */
const captureBounds = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measureBarBounds();
  });

const setParentRotation = (
  page: import('@playwright/test').Page,
  radians: number,
) =>
  page.evaluate(
    (r) => (window.__forgeTestHooks as unknown as Hooks).setParentRotation(r),
    radians,
  );

test.describe('world-space canvas rotation independence', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the world-space-canvas-rotation scene', async () => {
      // If the scene throws (e.g. WebGL2 context creation fails),
      // harness.ts rethrows after rendering the error into the page - catch
      // it here too so a scene-load failure reports its actual cause
      // instead of a bare "waitForFunction timed out".
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=world-space-canvas-rotation');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('keeps the health bar at a fixed on-screen position as its parent rotates', async ({
    page,
  }) => {
    const atZeroRotation =
      await test.step('capture the bar bounds at rotation 0', () =>
        captureBounds(page));

    expect(atZeroRotation).not.toBeNull();

    await test.step('rotate the parent a quarter turn and step', async () => {
      await setParentRotation(page, Math.PI / 2);
    });

    const afterQuarterTurn =
      await test.step('capture the bar bounds after rotating', () =>
        captureBounds(page));

    expect(afterQuarterTurn).not.toBeNull();

    await test.step('assert the bar stayed at the same on-screen position and size', () => {
      const before = atZeroRotation!;
      const after = afterQuarterTurn!;

      // Exact equality is realistic here (unlike a zoom/pan ratio test) -
      // nothing about the bar's own resolved rect depends on the parent's
      // rotation once inheritRotation is false, so a real regression would
      // show up as a large, unambiguous pixel shift, not a rounding-sized
      // one. A small tolerance still guards against flaky antialiasing.
      expect(after.left).toBeGreaterThanOrEqual(before.left - 1);
      expect(after.left).toBeLessThanOrEqual(before.left + 1);
      expect(after.right).toBeGreaterThanOrEqual(before.right - 1);
      expect(after.right).toBeLessThanOrEqual(before.right + 1);
      expect(after.top).toBeGreaterThanOrEqual(before.top - 1);
      expect(after.top).toBeLessThanOrEqual(before.top + 1);
      expect(after.bottom).toBeGreaterThanOrEqual(before.bottom - 1);
      expect(after.bottom).toBeLessThanOrEqual(before.bottom + 1);
    });

    await test.step('rotate a further half turn and assert the bar still has not moved', async () => {
      await setParentRotation(page, Math.PI * 1.5);

      const afterFurtherRotation = await captureBounds(page);

      expect(afterFurtherRotation).not.toBeNull();

      const before = atZeroRotation!;
      const after = afterFurtherRotation!;

      expect(after.left).toBeGreaterThanOrEqual(before.left - 1);
      expect(after.left).toBeLessThanOrEqual(before.left + 1);
      expect(after.top).toBeGreaterThanOrEqual(before.top - 1);
      expect(after.top).toBeLessThanOrEqual(before.top + 1);
    });
  });
});
