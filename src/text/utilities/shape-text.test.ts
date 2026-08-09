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
    expect(glyphs[0].offset).toEqual({ x: 3, y: 3.5 });
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

      // First glyph ("A") of each line, one `actualLineHeight` (12) apart.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5);
      expect(glyphs[2].offset.y).toBeCloseTo(3.5 - 12);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 24);

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
      // The lone word on line 2.
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 12);
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
    it('anchors the block by its top by default, unshifted', () => {
      const { glyphs } = shapeText('A', buildFixtureFontAtlasData(), {
        size: 10,
      });

      expect(glyphs[0].offset.y).toBeCloseTo(3.5);
    });

    it('anchors the block by its bottom', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'bottom',
      });

      // blockHeight is 36 (3 lines * 12); shifting by that puts the last
      // line's baseline where the first line's baseline would otherwise be.
      expect(glyphs[0].offset.y).toBeCloseTo(3.5 + 36);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 + 12);
    });

    it('anchors the block by its vertical center', () => {
      const { glyphs } = shapeText('AV AV AV', buildFixtureFontAtlasData(), {
        size: 10,
        maxWidth: 20,
        verticalAlign: 'middle',
      });

      expect(glyphs[0].offset.y).toBeCloseTo(3.5 + 18);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 6);
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

      expect(glyphs[0].offset.y).toBeCloseTo(3.5);
      expect(glyphs[2].offset.y).toBeCloseTo(3.5 - 24);
      expect(glyphs[4].offset.y).toBeCloseTo(3.5 - 48);
    });
  });
});
