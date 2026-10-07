import { expect, test } from '@playwright/test';
import type { PixelBounds } from '../fixtures/scenes/input-scene-helpers.js';
import type { SharedTextureSpritesSceneHandle } from '../fixtures/scenes/shared-texture-sprites.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = SharedTextureSpritesSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Steps a frame and measures it in the same task - see AGENTS.md's "Be wary
 * of pixel-level rendering assertions".
 */
const captureFrame = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      bounds: scene.measureSpriteBounds(),
      instancedDraws: [...scene.lastFrameInstancedDraws],
      spriteWorldSizes: scene.spriteWorldSizes,
      spriteOffsetInWorldUnits: scene.spriteOffsetInWorldUnits,
      devicePixelsPerUnit: scene.devicePixelsPerUnit,
    };
  });

const widthOf = (bounds: PixelBounds): number => bounds.right - bounds.left + 1;
const heightOf = (bounds: PixelBounds): number =>
  bounds.bottom - bounds.top + 1;
const centerXOf = (bounds: PixelBounds): number =>
  (bounds.left + bounds.right) / 2;

test.describe('Sprites sharing one texture', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the shared-texture-sprites scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=shared-texture-sprites');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('draws both sprites made from one texture, in one batch', async ({
    page,
  }) => {
    const frame = await test.step('render a frame', () => captureFrame(page));

    await test.step('assert both sprites appear at matching sizes', () => {
      const { left, right } = frame.bounds;

      expect(left).not.toBeNull();
      expect(right).not.toBeNull();

      if (left === null || right === null) {
        return;
      }

      // Both sprites came from separate `createImageSprite` calls on the
      // same texture, so they must be the same size on screen.
      expect(Math.abs(widthOf(left) - widthOf(right))).toBeLessThanOrEqual(2);
      expect(Math.abs(heightOf(left) - heightOf(right))).toBeLessThanOrEqual(2);

      // And that size is the world size `createImageSprite` computed.
      const [size] = frame.spriteWorldSizes;
      const expectedWidth = size.width * frame.devicePixelsPerUnit;
      const expectedHeight = size.height * frame.devicePixelsPerUnit;

      for (const bounds of [left, right]) {
        expect(widthOf(bounds)).toBeGreaterThan(expectedWidth * 0.9);
        expect(widthOf(bounds)).toBeLessThan(expectedWidth * 1.1);
        expect(heightOf(bounds)).toBeGreaterThan(expectedHeight * 0.9);
        expect(heightOf(bounds)).toBeLessThan(expectedHeight * 1.1);
      }

      // Their on-screen separation matches their world positions.
      const expectedSeparation =
        2 * frame.spriteOffsetInWorldUnits * frame.devicePixelsPerUnit;
      const separation = centerXOf(right) - centerXOf(left);

      expect(separation).toBeGreaterThan(expectedSeparation * 0.95);
      expect(separation).toBeLessThan(expectedSeparation * 1.05);
    });

    await test.step('assert one instanced draw call drew both', () => {
      expect(frame.instancedDraws).toEqual([2]);
    });
  });
});
