import { expect, test } from '@playwright/test';
import type {
  SampledColor,
  TranslucentUiCompositingMeasurement,
  TranslucentUiCompositingSceneHandle,
} from '../fixtures/scenes/translucent-ui-compositing.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`, since every scene assigns to the same global property.
// The cast below narrows it to this spec's own scene handle type inline, so
// multiple scenes' specs can coexist in one tsc program without clashing
// over incompatible `Window` augmentations - see `camera-pan-zoom.spec.ts`.
type Hooks = TranslucentUiCompositingSceneHandle;

// How far a panel's measured on-screen opacity may stray from its tint
// alpha. Generous enough to absorb 8-bit quantization (each of the two
// passes - into the UI render target, then presenting it - rounds to
// 1/255) and rasterizer differences, while still far tighter than the gap
// between correct compositing and the alpha-squaring bug this guards
// against (a 50% panel measured at 25% opacity).
const opacityTolerance = 0.05;

// How far apart a sampled pixel's channels may drift while still counting as
// neutral grey. Anything the canvas leaves partially transparent lets the
// scene's blue sampling backdrop through, which pushes blue well past this.
const neutralChannelTolerance = 6;

/**
 * Advances the scene by one frame and samples the composited canvas in the
 * same task - see AGENTS.md's "Be wary of pixel-level rendering assertions"
 * for why `step()` and any pixel read must happen in the same
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  worldRendersToTarget: boolean,
): Promise<TranslucentUiCompositingMeasurement> =>
  page.evaluate((rendersToTarget) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setWorldRendersToTarget(rendersToTarget);
    scene.step();

    return scene.measure();
  }, worldRendersToTarget);

const expectNeutral = (color: SampledColor, label: string): void => {
  expect(
    Math.abs(color.b - color.r),
    `${label} should be neutral grey, not tinted by the backdrop behind the canvas: ${JSON.stringify(color)}`,
  ).toBeLessThanOrEqual(neutralChannelTolerance);
  expect(
    Math.abs(color.g - color.r),
    `${label} should be neutral grey: ${JSON.stringify(color)}`,
  ).toBeLessThanOrEqual(neutralChannelTolerance);
};

const expectPanelsAtTheirTintOpacity = (
  measurement: TranslucentUiCompositingMeasurement,
): void => {
  const { background, panels } = measurement;

  // The world's opaque white clear must survive the UI being presented over
  // it, and stay opaque: this is the reference every panel is measured
  // against.
  expectNeutral(background, 'the world background');
  expect(
    background.r,
    `the world background should be visible: ${JSON.stringify(background)}`,
  ).toBeGreaterThan(200);

  for (const [index, { tintAlpha, color }] of panels.entries()) {
    const label = `panel ${index} (tint alpha ${tintAlpha})`;

    expectNeutral(color, label);

    // A black panel over white darkens it by exactly its effective opacity.
    const measuredOpacity = 1 - color.r / background.r;

    expect(
      measuredOpacity,
      `${label} should darken the world by its own tint alpha, measured ${measuredOpacity.toFixed(3)}`,
    ).toBeGreaterThan(tintAlpha - opacityTolerance);
    expect(
      measuredOpacity,
      `${label} should darken the world by its own tint alpha, measured ${measuredOpacity.toFixed(3)}`,
    ).toBeLessThan(tintAlpha + opacityTolerance);
  }
};

test.describe('translucent UI compositing', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the translucent-ui-compositing scene', async () => {
      // If the scene throws (e.g. WebGL2 context creation fails),
      // harness.ts rethrows after rendering the error into the page - catch
      // it here too so a scene-load failure reports its actual cause
      // instead of a bare "waitForFunction timed out".
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=translucent-ui-compositing');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('presents translucent UI panels at their tint opacity over a world render target', async ({
    page,
  }) => {
    const measurement =
      await test.step('render with the world camera drawing into its own render target', () =>
        captureMeasurement(page, true));

    await test.step('assert each panel darkens the world by its tint alpha', () => {
      expectPanelsAtTheirTintOpacity(measurement);
    });
  });

  test('presents translucent UI panels at their tint opacity over a world camera drawing straight to the canvas', async ({
    page,
  }) => {
    const measurement =
      await test.step('render with the world camera drawing straight onto the canvas', () =>
        captureMeasurement(page, false));

    await test.step('assert the world survives and each panel darkens it by its tint alpha', () => {
      expectPanelsAtTheirTintOpacity(measurement);
    });
  });
});
