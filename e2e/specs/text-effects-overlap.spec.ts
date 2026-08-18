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

function isBlueGlow(r: number, g: number, b: number): boolean {
  return b > 150 && r < 100 && g < 100;
}

// The text demo's own configured outline/glow colors (see
// documentation-site/src/pages/demos/text/_create-effects-examples.ts).
const demoOutlineColor = { r: 1, g: 0.55, b: 0.15, a: 1 };
const demoShadowColor = { r: 0.15, g: 0.65, b: 1, a: 0.95 };

function isDemoOutlineColor(r: number, g: number, b: number): boolean {
  return r > 180 && g > 90 && g < 210 && b < 130;
}

function isDemoGlowColor(r: number, b: number): boolean {
  return b > 150 && r < 150;
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

      return scene.sampleColorAt(
        scene.glyphACenterWorldX,
        scene.glyphCenterWorldY,
      );
    });

    expect(isRedInk(color.r, color.g, color.b)).toBe(true);
  });

  test("never paints outline color over a neighboring glyph's own ink, even at a large outlineWidth", async ({
    page,
  }) => {
    // The two glyphs in this scene are kerned so their *padded quads*
    // already overlap by 11 world units while their *ink* stays a real 5
    // world units apart (see text-effects-overlap.ts's derivation comment).
    // An outlineWidth far beyond the atlas's own budget must still leave
    // glyph A's own ink (sampled at `contestedWorldX`, a point inside A's
    // ink that an unclamped outline reaching all the way from B would have
    // painted over) showing A's ink color, not B's outline color - the
    // two-pass fill/effects draw order (see `msdf-effects.frag.glsl`'s doc
    // comment) is what actually guarantees this, not any per-glyph
    // neighbor clamp.
    const color = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(50);
      scene.step();

      return scene.sampleColorAt(
        scene.contestedWorldX,
        scene.glyphCenterWorldY,
      );
    });

    expect(isGreenOutline(color.r, color.g, color.b)).toBe(false);
    expect(isRedInk(color.r, color.g, color.b)).toBe(true);
  });

  test('a same-word neighbor-limited outline still visibly grows with outlineWidth, not stuck at a sliver', async ({
    page,
  }) => {
    // Regression guard for a real bug found after this clamp shipped: an
    // earlier version *halved* the ink gap between two same-word neighbors
    // (splitting it "evenly" between them), which made ordinary running
    // text's usable outline budget so small that increasing outlineWidth
    // had no visible effect at all above ~1 world unit. The fix lets each
    // glyph claim the *full* gap up to (not past) its neighbor's own ink -
    // this checks that `gapMidpointWorldX` (the middle of "A" and "B"'s real
    // ink gap) reads as background at a small outlineWidth (not yet reaching
    // halfway) but as A's outline at a larger one, proving the effect
    // actually scales with the requested value instead of being clamped to
    // an unusably small constant regardless of it.
    const results = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(1);
      scene.step();
      const atSmallWidth = scene.sampleColorAt(
        scene.gapMidpointWorldX,
        scene.glyphCenterWorldY,
      );

      scene.setOutlineWidth(3);
      scene.step();
      const atLargerWidth = scene.sampleColorAt(
        scene.gapMidpointWorldX,
        scene.glyphCenterWorldY,
      );

      return { atSmallWidth, atLargerWidth };
    });

    expect(
      isGreenOutline(
        results.atSmallWidth.r,
        results.atSmallWidth.g,
        results.atSmallWidth.b,
      ),
    ).toBe(false);
    expect(
      isGreenOutline(
        results.atLargerWidth.r,
        results.atLargerWidth.g,
        results.atLargerWidth.b,
      ),
    ).toBe(true);
  });

  test('still draws a visible outline elsewhere, so the clamp is not just suppressing everything', async ({
    page,
  }) => {
    // A sanity guard against a fix that "works" only by disabling outlines
    // entirely: glyph A and B are tightly kerned, but glyph C sits
    // comfortably wide of B and should still show a full, atlas-budget-only
    // outline at the same outlineWidth used above.
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

  test("a shadow's reach is bounded only by the atlas budget, not by how tightly a glyph is kerned against a neighbor", async ({
    page,
  }) => {
    // Regression guard for the fix that removed the shadow's old
    // same-word-neighbor clamp (see msdf-effects.frag.glsl's doc comment):
    // that clamp computed a single scalar "safe reach" per glyph from its
    // *tightest* neighbor gap, then applied it uniformly in every
    // direction around that glyph - so glyph A's shadow used to render
    // visibly thinner than an isolated glyph's even on A's own left side,
    // which has no neighbor at all (A's only neighbor, B, sits to its
    // right). `glyphAOuterEdgeWorldX` sits just outside that uncontested
    // left edge; a `shadowSoftness` comfortably within the atlas's own
    // ~7.5-screen-px budget but well beyond the old tight-pair clamp
    // (~5 world units, driven entirely by the unrelated A-B gap) must
    // still show full glow there.
    const color = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineWidth(0);
      scene.setShadowColor(0, 0, 1, 1);
      scene.setShadowOffset({ x: 0, y: 0 });
      scene.setShadowSoftness(7);
      scene.step();

      return scene.sampleColorAt(
        scene.glyphAOuterEdgeWorldX,
        scene.glyphCenterWorldY,
      );
    });

    expect(isBlueGlow(color.r, color.g, color.b)).toBe(true);
  });
});

test.describe("text effects at the demo's own configured values", () => {
  // The text demo (documentation-site/src/pages/demos/text/_create-effects-examples.ts)
  // uses outlineWidth: 2 and shadowSoftness: 2.5 - deliberately conservative,
  // documented-safe values (see text-effects.md), not the exaggerated 50
  // used above to stress the overlap clamp. This proves those specific,
  // small values actually render visibly on a real GPU, not just that a
  // large value can be clamped - closing the gap between "the clamp works"
  // and "the demo's own configuration is visible".
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

  test("outlineWidth: 2 with the demo's outline color reads clearly just outside a glyph's ink edge", async ({
    page,
  }) => {
    const color = await page.evaluate((outline) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setOutlineColor(outline.r, outline.g, outline.b, outline.a);
      scene.setOutlineWidth(2);
      scene.step();

      // Glyph C is unconstrained by any neighbor (see text-effects-overlap.ts) -
      // 1 world unit (~1 screen px) past its own ink edge, comfortably
      // inside a 2px-wide ring.
      return scene.sampleColorAt(
        scene.glyphCCenterWorldX + 32 + 1,
        scene.glyphCenterWorldY,
      );
    }, demoOutlineColor);

    expect(isDemoOutlineColor(color.r, color.g, color.b)).toBe(true);
  });

  test("shadowSoftness: 2.5 with the demo's glow color reads clearly somewhere around a glyph", async ({
    page,
  }) => {
    // The soft shadow/glow is offset (shadowOffset: {1.5, -1.5} in the
    // demo), so unlike the symmetric outline ring, it doesn't necessarily
    // show at every point around the glyph equally - sampling a ring of
    // candidate points around glyph C's ink boundary and requiring at
    // least one to read as the glow color is robust to exactly which side
    // it's strongest on, without hard-coding the shader's offset-to-screen-
    // direction mapping into the test.
    const colors = await page.evaluate((shadow) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setShadowColor(shadow.r, shadow.g, shadow.b, shadow.a);
      scene.setShadowOffset({ x: 1.5, y: -1.5 });
      scene.setShadowSoftness(2.5);
      scene.step();

      const cx = scene.glyphCCenterWorldX;
      const cy = scene.glyphCenterWorldY;
      const r = 32 + 3;

      return [
        scene.sampleColorAt(cx + r, cy),
        scene.sampleColorAt(cx - r, cy),
        scene.sampleColorAt(cx, cy + r),
        scene.sampleColorAt(cx, cy - r),
        scene.sampleColorAt(cx + r, cy - r),
        scene.sampleColorAt(cx - r, cy + r),
      ];
    }, demoShadowColor);

    expect(colors.some((color) => isDemoGlowColor(color.r, color.b))).toBe(
      true,
    );
  });
});
