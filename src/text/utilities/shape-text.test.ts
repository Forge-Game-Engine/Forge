import { describe, expect, it } from 'vitest';
import type { FontAtlasData } from '../font-atlas/font-atlas-data.js';
import { shapeText } from './shape-text.js';

const A_CODE_POINT = 65;
const V_CODE_POINT = 86;
const SPACE_CODE_POINT = 32;
const X_CODE_POINT = 120;

function buildFixtureFontAtlasData(): FontAtlasData {
  return {
    formatVersion: 2,
    type: 'msdf',
    atlasImage: 'fixture.png',
    atlasSize: { width: 256, height: 256 },
    distanceRange: 4,
    // `capHeight: 0.7` intentionally matches "A"/"V"'s own `planeBounds.top`
    // below - the fixture's stand-in for "a capital letter's actual top" -
    // while `ascender: 0.9` stays taller, standing in for a true ascender
    // (e.g. "b"/"d"/"h") that reaches higher than any capital does.
    metrics: {
      lineHeight: 1.2,
      ascender: 0.9,
      descender: -0.2,
      capHeight: 0.7,
    },
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
      [
        X_CODE_POINT,
        // An x-height glyph: unlike "A"/"V" it reaches neither the font's
        // ascender (0.9) nor its descender (-0.2), so it's the fixture
        // `'middle'` uses to tell "centered on this string's actual ink"
        // apart from "centered on the font's ascender/descender metrics".
        {
          codePoint: X_CODE_POINT,
          advance: 0.5,
          planeBounds: { left: 0.05, bottom: 0, right: 0.45, top: 0.5 },
          atlasBounds: { left: 0.2, bottom: 0, right: 0.3, top: 0.14 },
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
    it('centers each line within maxWidth, not just within each other', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'center',
      });

      // Both lines center against maxWidth (30), not against the block's
      // own widest line (line 1, 25.4 wide) - centering against the widest
      // line would leave line 1 itself unshifted, which is wrong: it's not
      // actually as wide as the requested container.
      const line1CenterOffset = (30 - 25.4) / 2;
      const line2CenterOffset = (30 - 11.2) / 2;

      expect(glyphs[0].offset.x).toBeCloseTo(3 + line1CenterOffset);
      expect(glyphs[4].offset.x).toBeCloseTo(3 + line2CenterOffset);
    });

    it('right-aligns each line within maxWidth, not just within each other', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'right',
      });

      expect(glyphs[0].offset.x).toBeCloseTo(3 + (30 - 25.4));
      expect(glyphs[4].offset.x).toBeCloseTo(3 + (30 - 11.2));
    });

    it('centers a single unwrapped line within maxWidth (regression: used to no-op)', () => {
      // A line that never wraps used to always compute a zero offset for
      // `center`/`right`, because the alignment reference was the content's
      // own bounding box - which a single line is always exactly as wide
      // as - rather than `maxWidth`. Fixed by aligning against `maxWidth`
      // whenever it's set, matching ordinary text-align semantics.
      const { glyphs } = shapeText('AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'center',
      });

      expect(glyphs[0].offset.x).toBeCloseTo(3 + (30 - 11.2) / 2);
    });

    it('right-aligns a single unwrapped line within maxWidth (regression: used to no-op)', () => {
      const { glyphs } = shapeText('AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 30,
        horizontalAlign: 'right',
      });

      expect(glyphs[0].offset.x).toBeCloseTo(3 + (30 - 11.2));
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

    describe('horizontalAlignPivot', () => {
      it('shifts a centered line so it centers on the box rather than on x = 0, when the local origin sits at the box center', () => {
        // A caller positioned by a center pivot (e.g. `UiAnchor.stretchAll`)
        // has its own local x = 0 sitting at the box's horizontal center,
        // not its left edge - `horizontalAlignPivot: 0.5` tells shapeText
        // that, so the alignment box (and therefore the centered line) is
        // shifted left by half of maxWidth relative to the no-pivot case.
        const { glyphs } = shapeText('AV', buildFixtureFontAtlasData(), {
          size: 10,
          maxWidth: 30,
          horizontalAlign: 'center',
          horizontalAlignPivot: 0.5,
        });

        expect(glyphs[0].offset.x).toBeCloseTo(3 + (30 - 11.2) / 2 - 15);
      });

      it('shifts a left-aligned line to still start at the box left edge, when the local origin sits at the box center', () => {
        const { glyphs } = shapeText('AV', buildFixtureFontAtlasData(), {
          size: 10,
          maxWidth: 30,
          horizontalAlignPivot: 0.5,
        });

        expect(glyphs[0].offset.x).toBeCloseTo(3 - 15);
      });

      it("defaults to 0, matching every alignment mode's pre-existing behavior", () => {
        const withoutPivot = shapeText('AV', buildFixtureFontAtlasData(), {
          size: 10,
          maxWidth: 30,
          horizontalAlign: 'center',
        });
        const withZeroPivot = shapeText('AV', buildFixtureFontAtlasData(), {
          size: 10,
          maxWidth: 30,
          horizontalAlign: 'center',
          horizontalAlignPivot: 0,
        });

        expect(withZeroPivot.glyphs[0].offset.x).toBeCloseTo(
          withoutPivot.glyphs[0].offset.x,
        );
      });
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

    it('anchors the block by the vertical center of its own rendered ink', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'middle',
      });

      // "A"/"V" both reach exactly the fixture's ascender/descender (0.7 top
      // vs ascender 0.9, 0 bottom vs descender -0.2 - each 0.2em short by
      // design, so this case can't tell "centered on rendered ink" apart
      // from "centered on the font's ascender/descender metrics"; see the
      // "centers on this string's own ink, not the font's ascender/
      // descender" test below for that). The block's actual rendered ink
      // spans from the first line's top (0.7 * 10 = 7) to the last line's
      // bottom (-(3 - 1) * 12 + 0 * 10 = -24); shifting by
      // `-(7 + -24) / 2` = 8.5 centers that (not the line-height box) on
      // y = 0.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 + 8.5);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24 + 8.5);
    });

    it("centers on this string's own ink, not the font's ascender/descender", () => {
      const { glyphs } = shapeText('x', buildFixtureFontAtlasData(), {
        size: 10,
        verticalAlign: 'middle',
      });

      // "x"'s baseline-relative center is `0 * 10 + 5 / 2` = 2.5 - well
      // short of the fixture's ascender (0.9) and descender (-0.2).
      // Centering on the font's metrics would shift by `-(9 + -2) / 2` =
      // -3.5, landing at `2.5 - 3.5` = -1; centering on "x"'s own rendered
      // ink instead shifts by `-(5 + 0) / 2` = -2.5, putting its actual
      // (not the font's nominal) vertical center at y = 0.
      expect(glyphs[0].offset.y).toBeCloseTo(0);
    });

    it('falls back to the font metrics when there is no visible ink to center on', () => {
      const { glyphs, bounds } = shapeText(' ', buildFixtureFontAtlasData(), {
        size: 10,
        verticalAlign: 'middle',
      });

      // A single space has no glyph quads at all, so there's no rendered
      // ink for `'middle'` to measure - this must not throw or divide by
      // an empty extent, and still shapes (an invisible, but valid) block.
      expect(glyphs).toHaveLength(0);
      expect(bounds.height).toBeCloseTo(12);
    });

    it("anchors the block by the first line's own baseline", () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'baseline',
      });

      // Line 0's baseline already sits at y = 0 before any offset - `A`/`V`
      // are baseline-relative center `3.5` above it - so `'baseline'` adds
      // no shift at all, regardless of line count or the font's metrics.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24);
    });

    it("anchors the block by the first line's cap height, not its ascender", () => {
      const { glyphs } = shapeText('A', buildFixtureFontAtlasData(), {
        size: 10,
        verticalAlign: 'capline',
      });

      // The fixture's `capHeight` (0.7) is shorter than its `ascender`
      // (0.9) - standing in for a real font's cap height (capital letters)
      // being shorter than its true ascender (which also covers taller
      // ascenders like "b"/"d"/"h"). Shifting by `-(0.7 * 10)` = -7 puts
      // "A"'s own top (which happens to sit exactly at the fixture's
      // capHeight) at y = 0, not the `-9` a `'top'`-style ascender anchor
      // would use (see the "anchors the block by its top" test above).
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 - 7);
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
