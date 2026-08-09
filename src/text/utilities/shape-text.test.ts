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
});
