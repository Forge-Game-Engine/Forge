import { expect, test } from '@playwright/test';
import type {
  CenterColor,
  MaterialUnusedUniformSceneHandle,
} from '../fixtures/scenes/material-unused-uniform.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = MaterialUnusedUniformSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Sets `u_color` and the stripped `u_unused` for a few frames, drawing each
 * one, and samples the last frame in the same task - see AGENTS.md's "Be
 * wary of pixel-level rendering assertions".
 */
const drawFrames = (page: Page, color: number[]) =>
  page.evaluate((color) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;
    const errors: (string | null)[] = [];

    for (let frame = 0; frame < 3; frame++) {
      errors.push(scene.trySetUniform('u_unused', frame * 0.5));
      errors.push(scene.trySetUniform('u_color', color));
      scene.step();
    }

    return { errors, center: scene.measureCenterColor() };
  }, color);

/** Which channel dominates a rendered color, or `null` for grey/white. */
const dominantChannel = ({ r, g, b }: CenterColor): 'r' | 'g' | 'b' | null => {
  const channels = { r, g, b };
  const sorted = (['r', 'g', 'b'] as const)
    .slice()
    .sort((a, c) => channels[c] - channels[a]);

  return channels[sorted[0]] - channels[sorted[1]] > 64 ? sorted[0] : null;
};

test.describe('Material uniforms the compiler stripped', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the material-unused-uniform scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=material-unused-uniform');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('sets a declared, unread uniform every frame without throwing', async ({
    page,
  }) => {
    await test.step('assert the compiler stripped u_unused', async () => {
      const hasLocation = await page.evaluate(() =>
        (
          window.__forgeTestHooks as unknown as Hooks
        ).hasUnusedUniformLocation(),
      );

      expect(hasLocation).toBe(false);
    });

    const red = await test.step('draw red frames while setting u_unused', () =>
      drawFrames(page, [1, 0, 0, 1]));
    const green =
      await test.step('draw green frames while setting u_unused', () =>
        drawFrames(page, [0, 1, 0, 1]));

    await test.step('assert no call threw and the frames rendered', () => {
      expect([...red.errors, ...green.errors]).toEqual(
        Array<null>(12).fill(null),
      );
      expect(dominantChannel(red.center)).toBe('r');
      expect(dominantChannel(green.center)).toBe('g');
    });
  });

  test('validates the stripped uniform and rejects undeclared names', async ({
    page,
  }) => {
    const errors = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      return {
        wrongType: scene.trySetUniform('u_unused', [1, 2]),
        undeclared: scene.trySetUniform('u_tint', 1),
      };
    });

    expect(errors.wrongType).toContain('is declared as float');
    expect(errors.undeclared).toBe(
      'Uniform "u_tint" is not declared in material "material-unused-uniform.vert" + "material-unused-uniform.frag". Declared uniforms: u_color, u_unused.',
    );
  });
});
