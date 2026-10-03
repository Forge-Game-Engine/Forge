import { expect, test } from '@playwright/test';
import type {
  PostProcessEffect,
  PostProcessPixelRatioSceneHandle,
} from '../fixtures/scenes/post-process-pixel-ratio.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = PostProcessPixelRatioSceneHandle;
type Browser = import('@playwright/test').Browser;

// Luminance at or below this counts as background: the glow has ended.
const backgroundLuminance = 2;

// Luminance at or above this counts as the square itself, not its glow.
const squareLuminance = 250;

interface Profile {
  pixelRatio: number;
  luminance: number[];
}

/**
 * Renders the scene with `effect` at `deviceScaleFactor` in its own browser
 * context and reads its luminance profile, in CSS pixels.
 * @param browser - The test's browser.
 * @param effect - The post-processing effect to apply.
 * @param deviceScaleFactor - The device pixel ratio to render at.
 * @returns The scene's pixel ratio and luminance profile.
 */
const renderProfile = async (
  browser: Browser,
  effect: PostProcessEffect,
  deviceScaleFactor: number,
): Promise<Profile> => {
  const { baseURL } = test.info().project.use;
  const context = await browser.newContext({ deviceScaleFactor });

  try {
    const page = await context.newPage();
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto(
      `${baseURL}/?scene=post-process-pixel-ratio&effect=${effect}`,
    );

    try {
      await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }

    return await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return {
        pixelRatio: scene.pixelRatio,
        luminance: scene.measureLuminanceProfile(),
      };
    });
  } finally {
    await context.close();
  }
};

/**
 * The CSS-pixel distance from the square's center to its edge: the first
 * reading that's no longer the square's own full brightness.
 * @param luminance - The profile.
 * @returns The distance, in CSS pixels.
 */
const squareEdge = (luminance: number[]): number =>
  luminance.findIndex((value) => value < squareLuminance);

/**
 * The CSS-pixel distance from the square's center to where its glow (or
 * blur) fades into the background.
 * @param luminance - The profile.
 * @returns The distance, in CSS pixels.
 */
const glowExtent = (luminance: number[]): number =>
  luminance.findIndex((value) => value <= backgroundLuminance);

for (const effect of ['bloom', 'blur'] as const) {
  test(`${effect} looks the same in CSS pixels at device scale factors 1 and 2`, async ({
    browser,
  }) => {
    const standard = await test.step('render at device scale factor 1', () =>
      renderProfile(browser, effect, 1));
    const highDpi = await test.step('render at device scale factor 2', () =>
      renderProfile(browser, effect, 2));

    expect(standard.pixelRatio).toBe(1);
    expect(highDpi.pixelRatio).toBe(2);

    // Bloom keeps the square's own core at full brightness; a blur dims
    // even its center, so only bloom has an edge to compare.
    if (effect === 'bloom') {
      expect(
        Math.abs(
          squareEdge(highDpi.luminance) - squareEdge(standard.luminance),
        ),
      ).toBeLessThanOrEqual(1);
    }

    const standardExtent = glowExtent(standard.luminance);
    const highDpiExtent = glowExtent(highDpi.luminance);

    // The effect actually ran: the square (5 CSS pixels from center to
    // edge) visibly spreads past its edge.
    expect(standardExtent).toBeGreaterThan(8);

    // Sized in device pixels, the glow at a pixel ratio of 2 ended several
    // CSS pixels sooner (15 vs. 24 for bloom, 8 vs. 12 for a blur).
    expect(Math.abs(highDpiExtent - standardExtent)).toBeLessThanOrEqual(2);

    // ...and bloom was more than twice as bright just outside the square.
    // Compare each CSS pixel from the center out to where the glow ends.
    for (let d = 0; d < standardExtent; d++) {
      const expected = standard.luminance[d];
      const tolerance = Math.max(12, expected * 0.25);

      expect(
        Math.abs(highDpi.luminance[d] - expected),
        `luminance ${d} CSS pixels from the center`,
      ).toBeLessThanOrEqual(tolerance);
    }
  });
}
