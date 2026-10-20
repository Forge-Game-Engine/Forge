import { expect, test } from '@playwright/test';
import type { TexturePackerAtlasSceneHandle } from '../fixtures/scenes/texture-packer-atlas.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = TexturePackerAtlasSceneHandle;
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
      frames: scene.measureFrames(),
      instancedDraws: [...scene.lastFrameInstancedDraws],
    };
  });

// Pixel quantization at the marker's edges.
const tolerance = 2;

test.describe('TexturePacker atlas', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the texture-packer-atlas scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=texture-packer-atlas');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('draws a trimmed frame where the source art puts it, in one batch with the untrimmed frame', async ({
    page,
  }) => {
    const { frames, instancedDraws } = await test.step('render a frame', () =>
      captureFrame(page));

    const trimmed = frames.trimmed.markerBounds;
    const reference = frames.reference.markerBounds;

    await test.step('assert both markers drew', () => {
      expect(trimmed).not.toBeNull();
      expect(reference).not.toBeNull();
    });

    if (!trimmed || !reference) {
      return;
    }

    await test.step('assert the trimmed marker is the size of the untrimmed one', () => {
      expect(
        Math.abs(
          trimmed.right - trimmed.left - (reference.right - reference.left),
        ),
      ).toBeLessThanOrEqual(tolerance);
      expect(
        Math.abs(
          trimmed.bottom - trimmed.top - (reference.bottom - reference.top),
        ),
      ).toBeLessThanOrEqual(tolerance);
    });

    await test.step('assert the trimmed marker sits at the same offset inside its untrimmed frame', () => {
      const referenceOffset = {
        x: reference.left - frames.reference.expectedFrameOrigin.left,
        y: reference.top - frames.reference.expectedFrameOrigin.top,
      };
      const trimmedOffset = {
        x: trimmed.left - frames.trimmed.expectedFrameOrigin.left,
        y: trimmed.top - frames.trimmed.expectedFrameOrigin.top,
      };

      // The marker is off the frame's corner in the source art, so a trim
      // dropped or applied from the wrong corner changes the offset.
      expect(referenceOffset.x).toBeGreaterThan(tolerance);
      expect(referenceOffset.y).toBeGreaterThan(tolerance);
      expect(Math.abs(trimmedOffset.x - referenceOffset.x)).toBeLessThanOrEqual(
        tolerance,
      );
      expect(Math.abs(trimmedOffset.y - referenceOffset.y)).toBeLessThanOrEqual(
        tolerance,
      );
    });

    await test.step('assert one instanced draw call drew both sprites', () => {
      expect(instancedDraws).toEqual([2]);
    });
  });
});
