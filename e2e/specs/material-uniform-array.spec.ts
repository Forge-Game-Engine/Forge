import { expect, test } from '@playwright/test';
import type {
  MaterialUniformArraySceneHandle,
  StripColor,
} from '../fixtures/scenes/material-uniform-array.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`, since every scene assigns to the same global property.
// The cast below narrows it to this spec's own scene handle type inline, so
// multiple scenes' specs can coexist in one tsc program without clashing
// over incompatible `Window` augmentations - see `camera-pan-zoom.spec.ts`.
type Hooks = MaterialUniformArraySceneHandle;
type Page = import('@playwright/test').Page;

// Red, green, blue and white, one per `u_waves` element (rgba each).
const primaryWaves = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1];

/**
 * Sets `u_waves`, draws a frame, and reads back both what the program holds
 * and what was rendered, all in one task - see AGENTS.md's "Be wary of
 * pixel-level rendering assertions" for why `step()` and any pixel read
 * must happen in the same `page.evaluate` call.
 */
const setWavesAndCapture = (
  page: Page,
  name: 'u_waves' | 'u_waves[0]',
  values: number[],
) =>
  page.evaluate(
    ({ name, values }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setWaves(name, values);
      scene.step();

      return {
        glError: scene.readGlError(),
        waves: scene.readWaves(),
        strips: scene.measureStripColors(),
      };
    },
    { name, values },
  );

/** Which channel dominates a rendered color, or `null` for grey/white. */
const dominantChannel = ({ r, g, b }: StripColor): 'r' | 'g' | 'b' | null => {
  const channels = { r, g, b };
  const sorted = (['r', 'g', 'b'] as const)
    .slice()
    .sort((a, c) => channels[c] - channels[a]);

  // Generous margin: only needs to tell a saturated primary apart from the
  // other channels, not match an exact byte value.
  return channels[sorted[0]] - channels[sorted[1]] > 64 ? sorted[0] : null;
};

test.describe('Material uniform arrays', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the material-uniform-array scene', async () => {
      // If the scene throws (e.g. WebGL2 context creation fails),
      // harness.ts rethrows after rendering the error into the page - catch
      // it here too so a scene-load failure reports its actual cause
      // instead of a bare "waitForFunction timed out".
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=material-uniform-array');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('uploads a vec4[4] uniform set by its declared name as four vec4s', async ({
    page,
  }) => {
    const captured = await test.step('set 16 floats on u_waves and draw', () =>
      setWavesAndCapture(page, 'u_waves', primaryWaves));

    await test.step('assert the program received every element', () => {
      expect(captured.glError).toBe(0);
      expect(captured.waves.flat()).toEqual(primaryWaves);
    });

    await test.step('assert each strip renders its own element', () => {
      const [red, green, blue, white] = captured.strips;

      expect(dominantChannel(red)).toBe('r');
      expect(dominantChannel(green)).toBe('g');
      expect(dominantChannel(blue)).toBe('b');
      expect(dominantChannel(white)).toBeNull();
      expect(white.r).toBeGreaterThan(red.g);
    });
  });

  test('updates only the leading elements from a shorter array', async ({
    page,
  }) => {
    const before = await test.step('set all four elements and draw', () =>
      setWavesAndCapture(page, 'u_waves', primaryWaves));

    // Swap the first two elements (green, red), leaving the rest untouched.
    const swapped = [0, 1, 0, 1, 1, 0, 0, 1];

    const after = await test.step('set 8 floats on u_waves[0] and draw', () =>
      setWavesAndCapture(page, 'u_waves[0]', swapped));

    await test.step('assert only the first two elements changed', () => {
      expect(after.glError).toBe(0);
      expect(after.waves.flat()).toEqual([
        ...swapped,
        ...primaryWaves.slice(swapped.length),
      ]);
    });

    await test.step('assert only the first two strips changed on screen', () => {
      expect(after.strips[0]).toEqual(before.strips[1]);
      expect(after.strips[1]).toEqual(before.strips[0]);
      expect(after.strips[2]).toEqual(before.strips[2]);
      expect(after.strips[3]).toEqual(before.strips[3]);
    });
  });
});
