import { expect, test } from '@playwright/test';
import type { TextEffectsSceneHandle } from '../fixtures/scenes/text-effects.js';
import { SYNTHETIC_GLYPH_DISTANCE_RANGE } from '../fixtures/scenes/create-synthetic-msdf-glyph-image.js';

// See `camera-pan-zoom.spec.ts` for why `window.__forgeTestHooks` is
// narrowed inline per-callback rather than augmented globally per-spec.
type Hooks = TextEffectsSceneHandle;
type Page = import('@playwright/test').Page;

const captureBounds = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measureGlyphBounds();
  });

const width = (bounds: { left: number; right: number } | null): number => {
  expect(bounds).not.toBeNull();

  return bounds!.right - bounds!.left;
};

test.describe('text outline/shadow effects', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the text-effects scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=text-effects');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('a very wide outline stays a bounded ring instead of filling the whole glyph quad', async ({
    page,
  }) => {
    const baseline = await test.step('measure the glyph with no outline', () =>
      captureBounds(page));

    const baselineWidth = width(baseline);

    await test.step('set a modest, in-budget outline width', () =>
      page.evaluate(() => {
        (window.__forgeTestHooks as unknown as Hooks).setOutlineWidth(2);
      }));

    const modest =
      await test.step('measure the glyph with a modest outline', () =>
        captureBounds(page));

    const modestWidth = width(modest);

    await test.step('request an outline width far beyond what the atlas can encode', () =>
      page.evaluate(() => {
        // Far beyond `SYNTHETIC_GLYPH_DISTANCE_RANGE` (and therefore
        // `msdf.frag.glsl`'s `maxSafeEffectDistance`), the same way the
        // demo's original `outlineWidth: 3` on a small atlas budget did.
        (window.__forgeTestHooks as unknown as Hooks).setOutlineWidth(1000);
      }));

    const huge =
      await test.step('measure the glyph with the oversized outline', () =>
        captureBounds(page));

    const hugeWidth = width(huge);

    await test.step("assert the outline grew, but stayed bounded to the atlas's real distance-field budget", () => {
      expect(modestWidth).toBeGreaterThan(baselineWidth);
      expect(hugeWidth).toBeGreaterThan(modestWidth);

      // The bug this guards against: an unbounded outline reads the entire
      // saturated "fully outside" region as solid coverage, growing all the
      // way out to the glyph's own render quad - here, that quad extends a
      // full `SYNTHETIC_GLYPH_DISTANCE_RANGE`-independent margin far larger
      // than the atlas's encoded range. Capping the effective width to the
      // atlas's real budget keeps the requested-1000 outline within a small
      // multiple of `SYNTHETIC_GLYPH_DISTANCE_RANGE` of the modest one,
      // rather than blowing out toward the quad's full size.
      expect(hugeWidth).toBeLessThan(
        modestWidth + SYNTHETIC_GLYPH_DISTANCE_RANGE * 2,
      );
    });
  });

  test('a very soft shadow fades out instead of filling the whole glyph quad', async ({
    page,
  }) => {
    const baseline =
      await test.step('measure the glyph with a crisp (softness 0) shadow', () =>
        captureBounds(page));

    const baselineWidth = width(baseline);

    await test.step('set a modest, in-budget shadow softness', () =>
      page.evaluate(() => {
        (window.__forgeTestHooks as unknown as Hooks).setShadowSoftness(2);
      }));

    const modest = await test.step('measure the glyph with a modest glow', () =>
      captureBounds(page));

    const modestWidth = width(modest);

    await test.step('request a shadow softness far beyond what the atlas can encode', () =>
      page.evaluate(() => {
        (window.__forgeTestHooks as unknown as Hooks).setShadowSoftness(1000);
      }));

    const huge =
      await test.step('measure the glyph with the oversized glow', () =>
        captureBounds(page));

    const hugeWidth = width(huge);

    await test.step("assert the glow grew, but faded out within the atlas's real distance-field budget", () => {
      expect(modestWidth).toBeGreaterThan(baselineWidth);
      expect(hugeWidth).toBeGreaterThan(modestWidth);

      // The bug this guards against: dividing by an unbounded softness
      // produced a coverage value that plateaued at some constant non-zero
      // alpha across the entire saturated region instead of fading to `0` -
      // a flat, un-tapering rectangle of color reaching the glyph's full
      // render quad, rather than a shadow that actually fades out.
      expect(hugeWidth).toBeLessThan(
        modestWidth + SYNTHETIC_GLYPH_DISTANCE_RANGE * 2,
      );
    });
  });
});
