import { describe, expect, it } from 'vitest';
import type { FontAtlasData } from '../font-atlas/font-atlas-data.js';
import { shapeText } from './shape-text.js';

const A_CODE_POINT = 65;
const V_CODE_POINT = 86;
const SPACE_CODE_POINT = 32;

function buildFixtureFontAtlasData(): FontAtlasData {
  return {
    formatVersion: 1,
    type: 'msdf',
    atlasImage: 'fixture.png',
    atlasSize: { width: 256, height: 256 },
    distanceRange: 4,
    metrics: { lineHeight: 1.2, ascender: 0.9, descender: -0.2 },
    glyphs: new Map([
      [
        A_CODE_POINT,
        {
          codePoint: A_CODE_POINT,
          advance: 0.6,
          planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
          atlasBounds: { left: 0, bottom: 0, right: 0.1, top: 0.14 },
        },
      ],
      [
        V_CODE_POINT,
        {
          codePoint: V_CODE_POINT,
          advance: 0.6,
          planeBounds: { left: 0.02, bottom: 0, right: 0.58, top: 0.7 },
          atlasBounds: { left: 0.1, bottom: 0, right: 0.2, top: 0.14 },
        },
      ],
      [
        SPACE_CODE_POINT,
        {
          codePoint: SPACE_CODE_POINT,
          advance: 0.3,
          planeBounds: null,
          atlasBounds: null,
        },
      ],
    ]),
    kerning: new Map([[`${A_CODE_POINT}:${V_CODE_POINT}`, -0.08]]),
  };
}

describe('shapeText', () => {
  it('positions a single glyph centered on its plane bounds, scaled by size', () => {
    const { glyphs, bounds } = shapeText('A', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs).toHaveLength(1);
    // `verticalAlign` defaults to `'top'`, which anchors the first line's
    // *ascender* (0.9em * size 10 = 9) to y = 0, not its baseline - so the
    // baseline-relative x/y this glyph would otherwise sit at (3, 3.5) is
    // shifted down by 9.
    expect(glyphs[0].offset).toEqual({ x: 3, y: 3.5 - 9 });
    expect(glyphs[0].size).toEqual({ x: 5, y: 7 });

    // `atlasBounds` is `{ left: 0, bottom: 0, right: 0.1, top: 0.14 }`, a
    // 256-wide/tall atlas (1/256 texel), inset by one texel on each edge to
    // avoid GL_LINEAR sampling across the tile boundary into the next
    // glyph, then flipped to this engine's Y-down UV convention.
    const inset = 1 / 256;
    expect(glyphs[0].uvOffset.x).toBeCloseTo(inset);
    expect(glyphs[0].uvOffset.y).toBeCloseTo(1 - (0.14 - inset));
    expect(glyphs[0].uvScale.x).toBeCloseTo(0.1 - 2 * inset);
    expect(glyphs[0].uvScale.y).toBeCloseTo(0.14 - 2 * inset);

    expect(bounds).toEqual({ width: 6, height: 12 });
  });

  it('advances the pen by each glyph advance, scaled by size', () => {
    const { glyphs } = shapeText('AA', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs[0].offset.x).toBeCloseTo(3);
    // Second "A" starts a full advance-width (6 world units) further right.
    expect(glyphs[1].offset.x).toBeCloseTo(9);
  });

  it('applies a kerning pair between adjacent glyphs, scaled by size', () => {
    const { glyphs, bounds } = shapeText('AV', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs).toHaveLength(2);
    expect(glyphs[0].offset.x).toBeCloseTo(3);
    // Without kerning this would start at 6 + 0.2 + 2.8 = 9; the -0.08 em
    // kerning pair (scaled by size 10) pulls it 0.8 world units closer.
    expect(glyphs[1].offset.x).toBeCloseTo(8.2);
    expect(bounds.width).toBeCloseTo(11.2);
  });

  it('advances the pen for whitespace without emitting a glyph quad', () => {
    const { glyphs, bounds } = shapeText('A V', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs).toHaveLength(2);
    // "A" (advance 6) + space (advance 3, no kerning pair for "A "/" V")
    // pushes "V" to start at 9 + 0.2 + 2.8 = 12.
    expect(glyphs[1].offset.x).toBeCloseTo(12);
    expect(bounds.width).toBeCloseTo(15);
  });

  it('silently skips code points missing from the atlas, without advancing the pen', () => {
    const { glyphs, bounds } = shapeText('A?V', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs).toHaveLength(2);
    // No kerning is applied across the skipped "?": "V" lands where it
    // would immediately after "A" advances alone (6 + 0.2 + 2.8 = 9), not
    // the kerned 8.2 from the "AV" test above.
    expect(glyphs[1].offset.x).toBeCloseTo(9);
    expect(bounds.width).toBeCloseTo(12);
  });

  it('adds letterSpacing to every glyph advance, scaled by size', () => {
    const { bounds } = shapeText('AV', buildFixtureFontAtlasData(), {
      size: 10,
      letterSpacing: 0.1,
    });

    // Each advance grows by 0.1 em (1 world unit at size 10), on top of the
    // kerned "AV" width of 11.2 from two glyphs.
    expect(bounds.width).toBeCloseTo(13.2);
  });

  it('returns empty glyphs and zero width for an empty string', () => {
    const { glyphs, bounds } = shapeText('', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(glyphs).toEqual([]);
    expect(bounds.width).toBe(0);
  });

  it("uses the atlas's line height for bounds height, regardless of content", () => {
    const { bounds } = shapeText('A', buildFixtureFontAtlasData(), {
      size: 10,
    });

    expect(bounds.height).toBeCloseTo(12);
  });

  describe('word wrapping', () => {
    // Every "AV" word is 11.2 world units wide (see the kerning test above)
    // and the space between words advances the pen by 3 (0.3 em * size 10).

    it('wraps onto a new line when the next word would exceed maxWidth', () => {
      const { glyphs, bounds } = shapeText(
        'AV AV AV',
        buildFixtureFontAtlasData(),
        { size: 10, maxWidth: 20 },
      );

      // Each line only has room for one 11.2-wide word (11.2 + 3 + 11.2 =
      // 25.4 > 20), so all three words land on their own line.
      expect(glyphs).toHaveLength(6);
      expect(bounds).toEqual({ width: 11.2, height: 36 });

      // First glyph ("A") of each line, one `actualLineHeight` (12) apart,
      // all shifted down by the default `'top'` alignment's ascender
      // offset (9 - see the single-glyph test above).
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 - 9);
      expect(glyphs[2].offset.y).toBeCloseTo(3.5 - 12 - 9);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24 - 9);

      // Every line is left-aligned by default, starting at x = 0.
      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[2].offset.x).toBeCloseTo(3);
      expect(glyphs[4].offset.x).toBeCloseTo(3);
    });

    it('keeps as many words per line as fit within maxWidth', () => {
      const { glyphs, bounds } = shapeText(
        'AV AV AV',
        buildFixtureFontAtlasData(),
        { size: 10, maxWidth: 30 },
      );

      // Line 1: "AV" (11.2) + space (3) + "AV" (11.2) = 25.4, fits in 30.
      // Adding a third "AV" would be 25.4 + 3 + 11.2 = 39.6, which doesn't.
      expect(bounds).toEqual({ width: 25.4, height: 24 });
      expect(glyphs).toHaveLength(6);
      // Second word on line 1 starts after the first word + space (14.2).
      expect(glyphs[2].offset.x).toBeCloseTo(3 + 14.2);
      // The lone word on line 2, shifted down by the default `'top'`
      // alignment's ascender offset (9).
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 12 - 9);
    });

    it('never splits a single word wider than maxWidth', () => {
      const { glyphs, bounds } = shapeText('AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 5,
      });

      expect(glyphs).toHaveLength(2);
      expect(bounds.width).toBeCloseTo(11.2);
    });

    it('does not wrap when maxWidth is unset', () => {
      const { glyphs, bounds } = shapeText(
        'AV AV AV',
        buildFixtureFontAtlasData(),
        { size: 10 },
      );

      expect(glyphs).toHaveLength(6);
      expect(bounds.height).toBeCloseTo(12);
    });
  });

  describe('horizontal alignment', () => {
    it('centers each line within the block width', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'center',
      });

      // Line 1 (25.4 wide) is the block's full width, so it's unshifted;
      // line 2's lone "AV" (11.2 wide) is centered within the 25.4 block.
      const centerOffset = (25.4 - 11.2) / 2;

      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[4].offset.x).toBeCloseTo(3 + centerOffset);
    });

    it('right-aligns each line within the block width', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'right',
      });

      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[4].offset.x).toBeCloseTo(3 + (25.4 - 11.2));
    });

    it('stretches inter-word gaps to justify a wrapped line, but not the last line', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'justify',
      });

      // Line 1 ("AV AV", natural width 25.4) stretches to fill maxWidth
      // (30): the single gap grows by (30 - 25.4) / 1 = 4.6.
      const gapStretch = 30 - 25.4;

      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[2].offset.x).toBeCloseTo(3 + 14.2 + gapStretch);

      // Line 2 is the last line and has only one word, so it stays
      // left-aligned rather than being stretched.
      expect(glyphs[4].offset.x).toBeCloseTo(3);
    });

    it('does not justify a single-word line (nothing to stretch)', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        horizontalAlign: 'justify',
      });

      // Every line here has exactly one word (see the maxWidth: 20 wrapping
      // test above), so justify has nothing to stretch and every line
      // stays left-aligned.
      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[2].offset.x).toBeCloseTo(3);
      expect(glyphs[4].offset.x).toBeCloseTo(3);
    });

    it('has no effect when maxWidth is unset', () => {
      const { glyphs } = shapeText('AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        horizontalAlign: 'justify',
      });

      // Unwrapped text is always exactly one line, so it's already exactly
      // as wide as the block - justify has nothing to distribute.
      expect(glyphs[0].offset.x).toBeCloseTo(3);
      expect(glyphs[2].offset.x).toBeCloseTo(3 + 14.2);
    });
  });

  describe('vertical alignment', () => {
    // Anchored to the block's visible ink (ascender/descender), not its
    // line-height box: fixture metrics are `ascender: 0.9`, `descender:
    // -0.2`, so at size 10, `inkTop = 9` and (for a 3-line, `actualLineHeight:
    // 12` block) `inkBottom = -(3 - 1) * 12 + -0.2 * 10 = -26`.

    it("anchors the block by its top (the first line's ascender) by default", () => {
      const { glyphs } = shapeText('A', buildFixtureFontAtlasData(), {
        size: 10,
      });

      // `inkTop` for a single line is `0.9 * 10 = 9`; shifting the
      // baseline-relative y (3.5) down by that puts the ascender at y = 0.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 - 9);
    });

    it("anchors the block by its bottom (the last line's descender)", () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'bottom',
      });

      // Shifting by `-inkBottom` (26) puts the last line's descender at y = 0.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 + 26);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24 + 26);
    });

    it('anchors the block by the vertical center of its ink', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'middle',
      });

      // Shifting by `-(inkTop + inkBottom) / 2` = `-(9 + -26) / 2` = 8.5
      // centers the ink (not the line-height box) on y = 0.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 + 8.5);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24 + 8.5);
    });
  });

  describe('effectClearance (outline/shadow overlap safety)', () => {
    // See `assignEffectClearances` in shape-text.ts: half the gap, in world
    // units, to the tighter of a glyph's same-word left/right neighbors, so
    // an outline/shadow effect on two adjacent glyphs can never together
    // reach far enough to visually overlap.

    it('gives a lone glyph the unconstrained sentinel, halved', () => {
      const { glyphs } = shapeText('A', buildFixtureFontAtlasData(), {
        size: 10,
      });

      // No same-word neighbor on either side, so both sides fall back to
      // the internal 100-world-unit "unconstrained" sentinel; halved (per
      // glyph's own share of an infinite gap) is 50.
      expect(glyphs[0].effectClearance).toBe(50);
    });

    it('halves the real ink gap between two same-word neighbors with no kerning pair', () => {
      const { glyphs } = shapeText('AA', buildFixtureFontAtlasData(), {
        size: 10,
      });

      // Each "A" quad is 5 world units wide (plane bounds 0.05-0.55em * size
      // 10), advancing by 6 (0.6em * size 10, no A:A kerning pair) - a 1
      // world unit gap between the first glyph's *quad* edge and the
      // second's, but the gap between their *ink* edges is wider still: each
      // "A"'s own quad-to-ink padding is distanceRange/2 (2 atlas px) scaled
      // to world units via this glyph's own atlas-pixels-to-world-units
      // ratio (25.6 atlas px per 5 world units) - 0.390625 world units per
      // side. Ink gap = 1 + 0.390625 + 0.390625 = 1.78125, split 50/50.
      expect(glyphs[0].effectClearance).toBeCloseTo(0.890625);
      expect(glyphs[1].effectClearance).toBeCloseTo(0.890625);
    });

    it('does not clamp a small, realistic kerning correction that never brings the ink close', () => {
      const { glyphs } = shapeText('AV', buildFixtureFontAtlasData(), {
        size: 10,
      });

      // "AV"'s -0.08em kerning pair pulls the *padded quads* into a slight
      // (-0.1 world unit) overlap - the bug fixed by measuring from ink
      // edges instead of quad edges (see assignEffectClearances's doc
      // comment): despite that quad overlap, the actual *ink* stays a real
      // ~0.73 world unit gap apart (0.390625 + 0.4375 of quad-to-ink padding
      // more than offsets the -0.1 quad overlap), so this ordinary,
      // realistic kerning value must not clamp the effect to 0.
      expect(glyphs[0].effectClearance).toBeGreaterThan(0);
      expect(glyphs[1].effectClearance).toBeGreaterThan(0);
      expect(glyphs[0].effectClearance).toBeCloseTo(0.3640625);
      expect(glyphs[1].effectClearance).toBeCloseTo(0.3640625);
    });

    it('clamps to zero when kerning is tight enough that ink genuinely touches', () => {
      const extremeKerningFontAtlasData: FontAtlasData = {
        ...buildFixtureFontAtlasData(),
        // Far more extreme than any real font's kerning table - deliberately
        // constructed so "A"'s and "V"'s *ink* (not just their padded
        // quads) genuinely touches, the case `effectClearance` must still
        // catch.
        kerning: new Map([[`${A_CODE_POINT}:${V_CODE_POINT}`, -0.5]]),
      };

      const { glyphs } = shapeText('AV', extremeKerningFontAtlasData, {
        size: 10,
      });

      expect(glyphs[0].effectClearance).toBe(0);
      expect(glyphs[1].effectClearance).toBe(0);
    });

    it('treats a word boundary as unconstrained, not the actual whitespace gap', () => {
      const { glyphs } = shapeText('A V', buildFixtureFontAtlasData(), {
        size: 10,
      });

      // "A" and "V" are in separate words (split on the space), so neither
      // one's effectClearance is computed from the actual, much larger,
      // cross-word gap - both fall back to the same lone-glyph sentinel
      // (50) as the single-"A"-word case above. This is the deliberate
      // same-word-only scope described in `assignEffectClearances`.
      expect(glyphs[0].effectClearance).toBe(50);
      expect(glyphs[1].effectClearance).toBe(50);
    });

    it('is unaffected by line/word placement offsets', () => {
      // Regression guard: `effectClearance` is computed in word-local
      // coordinates before `shapeText` translates words/lines into their
      // final block position - translating both a glyph and its neighbor by
      // the same offset must never change the gap between them.
      const unwrapped = shapeText('AA', buildFixtureFontAtlasData(), {
        size: 10,
      });
      const wrappedOntoSecondLine = shapeText(
        'AV AA',
        buildFixtureFontAtlasData(),
        { size: 10, maxWidth: 12 },
      );

      const secondWordGlyphs = wrappedOntoSecondLine.glyphs.slice(2);

      expect(secondWordGlyphs[0].effectClearance).toBeCloseTo(
        unwrapped.glyphs[0].effectClearance,
      );
      expect(secondWordGlyphs[1].effectClearance).toBeCloseTo(
        unwrapped.glyphs[1].effectClearance,
      );
    });
  });

  describe('line height', () => {
    it('multiplies the block height by the lineHeight option', () => {
      const { bounds } = shapeText('A', buildFixtureFontAtlasData(), {
        size: 10,
        lineHeight: 2,
      });

      expect(bounds.height).toBeCloseTo(24);
    });

    it('spaces wrapped lines apart by the multiplied line height', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        lineHeight: 2,
      });

      // `actualLineHeight` doubles to 24, but the default `'top'`
      // alignment's ascender offset (9) is independent of `lineHeight` - it
      // only depends on the font's own `ascender` metric and `size`.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 - 9);
      expect(glyphs[2].offset.y).toBeCloseTo(3.5 - 24 - 9);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 48 - 9);
    });
  });
});
