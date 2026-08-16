import { expect, test } from '@playwright/test';
import type { TextEffectsOverlapSceneHandle } from '../fixtures/scenes/text-effects-overlap.js';

// See the note in camera-pan-zoom.spec.ts: `window.__forgeTestHooks` is
// declared globally by harness.ts, narrowed inline per spec.
type Hooks = TextEffectsOverlapSceneHandle;

// Loose color-family checks, not exact byte equality - SwiftShader/AA
// rounding blends edge pixels toward neighboring colors (see AGENTS.md's
// "Be wary of pixel-level rendering assertions"). This only needs to tell
// "clearly red" apart from "clearly green" apart from "clearly black".
function isRedInk(r: number, g: number, b: number): boolean {
  return r > 150 && g < 100 && b < 100;
}

function isGreenOutline(r: number, g: number, b: number): boolean {
  return g > 150 && r < 100 && b < 100;
}

test.describe('text outline/shadow effect overlap', () => {
  test.beforeEach(async ({ page }) => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=text-effects-overlap');

    try {
      await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });

  test("renders glyph A's own ink, unaffected by outline, as a same-run baseline", async ({
    page,
  }) => {
    const color = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(0);
      scene.step();

      return scene.sampleColorAt(scene.glyphACenterWorldX, scene.glyphCenterWorldY);
    });

    expect(isRedInk(color.r, color.g, color.b)).toBe(true);
  });

  test('never paints outline color over a neighboring glyph\'s own ink, even at a large outlineWidth', async ({
    page,
  }) => {
    // The two glyphs in this scene are kerned so their *padded quads*
    // already overlap by 11 world units while their *ink* stays a real 5
    // world units apart (see text-effects-overlap.ts's derivation comment)
    // - exactly the tight-kerning case `assignEffectClearances` in
    // shape-text.ts clamps to 0. An outlineWidth far beyond both the
    // atlas's own budget and that clearance must still leave glyph A's own
    // ink (sampled at `contestedWorldX`, a point inside A's ink that a
    // neighbor-unaware clamp would have painted glyph B's outline color
    // over) showing A's ink color, not B's outline color.
    const color = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(50);
      scene.step();

      return scene.sampleColorAt(scene.contestedWorldX, scene.glyphCenterWorldY);
    });

    expect(isGreenOutline(color.r, color.g, color.b)).toBe(false);
    expect(isRedInk(color.r, color.g, color.b)).toBe(true);
  });

  test('still draws a visible outline elsewhere, so the clamp is not just suppressing everything', async ({
    page,
  }) => {
    // A sanity guard against a fix that "works" only by disabling outlines
    // entirely: glyph A and B are tightly kerned (clamped to 0 clearance
    // uniformly on *both* sides, by design - see shape-text.ts), but glyph
    // C sits comfortably wide of B and should still show a full,
    // atlas-budget-only outline at the same outlineWidth used above.
    const color = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(50);
      scene.step();

      return scene.sampleColorAt(
        scene.glyphCOuterEdgeWorldX,
        scene.glyphCenterWorldY,
      );
    });

    expect(isGreenOutline(color.r, color.g, color.b)).toBe(true);
  });
});
