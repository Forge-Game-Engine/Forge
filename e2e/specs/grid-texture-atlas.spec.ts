import { expect, test } from '@playwright/test';
import type { GridTextureAtlasSceneHandle } from '../fixtures/scenes/grid-texture-atlas.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = GridTextureAtlasSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Steps a frame and compares it in the same task - see AGENTS.md's "Be wary
 * of pixel-level rendering assertions".
 */
const captureFrame = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      cells: scene.compareCells(),
      cellCount: scene.cellCount,
      instancedDraws: [...scene.lastFrameInstancedDraws],
    };
  });

test.describe('Grid texture atlas', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the grid-texture-atlas scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=grid-texture-atlas');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('draws exactly each cell, in one batch with the rest of the atlas', async ({
    page,
  }) => {
    const frame = await test.step('render a frame', () => captureFrame(page));

    await test.step('assert each cell sprite matches its cell of the sheet', () => {
      expect(frame.cells).toHaveLength(frame.cellCount);

      for (const cell of frame.cells) {
        // A sprite that sampled one texel of the gutter or a neighbor along
        // an edge would differ over an eighth of its pixels.
        expect(cell.mismatchWithOwnCell).toBeLessThan(0.02);
        // And the comparison tells cells apart: every cell has its own color.
        expect(cell.mismatchWithNextCell).toBeGreaterThan(0.5);
      }
    });

    await test.step('assert one instanced draw call drew every sprite', () => {
      // The reference sheet and the six cells all draw the atlas's texture.
      expect(frame.instancedDraws).toEqual([frame.cellCount + 1]);
    });
  });
});
