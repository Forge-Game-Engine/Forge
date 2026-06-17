import { beforeEach, describe, expect, it } from 'vitest';
import { shapeText } from './shape-text.js';
import type { FontAsset, GlyphMetrics } from './types/font-asset.js';
import { Vector2 } from '../../math/index.js';

function makeGlyph(
  codepoint: number,
  width: number,
  height: number,
  xoffset: number,
  yoffset: number,
  advance: number,
): GlyphMetrics {
  return {
    codepoint,
    uvRect: { x: 0, y: 0, w: 0.1, h: 0.1 },
    size: { w: width, h: height },
    bearing: { x: xoffset, y: yoffset },
    advance,
  };
}

// Simple mock font: lineHeight=32, base=24
// All glyphs 8px wide (advance=8), except space (advance=4).
function makeMockFont(
  extraGlyphs: Map<number, GlyphMetrics> = new Map(),
): FontAsset {
  const glyphs = new Map<number, GlyphMetrics>();

  // ASCII 65-90 (A-Z) and 97-122 (a-z)
  for (let cp = 65; cp <= 122; cp++) {
    glyphs.set(cp, makeGlyph(cp, 8, 20, 0, 4, 8));
  }

  glyphs.set(0x0020, makeGlyph(0x0020, 0, 0, 0, 0, 4)); // space
  glyphs.set(0x2026, makeGlyph(0x2026, 8, 20, 0, 4, 8)); // ellipsis

  for (const [cp, g] of extraGlyphs) {
    glyphs.set(cp, g);
  }

  return {
    texture: {} as WebGLTexture,
    atlasSize: new Vector2(512, 512),
    lineHeight: 32,
    ascent: 24,
    descent: 8,
    base: 24,
    distanceRange: 4,
    sdfType: 'msdf',
    glyphs,
  };
}

describe('shapeText', () => {
  let font: FontAsset;

  beforeEach(() => {
    font = makeMockFont();
  });

  describe('basic advance & glyph positions', () => {
    it('places a single character at origin with correct bearing', () => {
      const result = shapeText('A', font, { fontSize: 32 });

      expect(result.glyphs).toHaveLength(1);
      const g = result.glyphs[0];
      // bearing.x = 0, bearing.y = 4 (yoffset), scaled by 32/32 = 1
      expect(g.x).toBeCloseTo(0);
      expect(g.y).toBeCloseTo(4);
      expect(g.width).toBeCloseTo(8);
      expect(g.height).toBeCloseTo(20);
    });

    it('advances cursor correctly for multiple characters', () => {
      const result = shapeText('AB', font, { fontSize: 32 });

      expect(result.glyphs).toHaveLength(2);
      // A at x=0, B at x=8 (advance of A)
      expect(result.glyphs[0].x).toBeCloseTo(0);
      expect(result.glyphs[1].x).toBeCloseTo(8);
    });

    it('scales glyphs proportionally when fontSize differs from lineHeight', () => {
      const result = shapeText('A', font, { fontSize: 16 });

      // scale = 16/32 = 0.5
      expect(result.glyphs[0].width).toBeCloseTo(4);
      expect(result.glyphs[0].height).toBeCloseTo(10);
      expect(result.glyphs[0].y).toBeCloseTo(2); // yoffset 4 * 0.5
    });

    it('skips whitespace-only glyphs but advances cursor', () => {
      const result = shapeText('A B', font, { fontSize: 32 });

      // 'A' and 'B' are shaped; space is skipped as a glyph
      expect(result.glyphs).toHaveLength(2);
      // B starts at A.advance + space.advance = 8 + 4 = 12
      expect(result.glyphs[1].x).toBeCloseTo(12);
    });

    it('returns correct bounds for a single line', () => {
      const result = shapeText('AB', font, { fontSize: 32 });

      // Two chars at advance 8 each → width 16, height = lineHeight = 32
      expect(result.bounds.w).toBeCloseTo(16);
      expect(result.bounds.h).toBeCloseTo(32);
    });
  });

  describe('kerning', () => {
    it('applies kerning between two characters', () => {
      const fontWithKerning = makeMockFont();
      fontWithKerning.kerning = new Map([[65, new Map([[86, -2]])]]); // A-V: -2px

      const result = shapeText('AV', fontWithKerning, { fontSize: 32 });

      // V starts at A.advance + kerning = 8 + (-2) = 6
      expect(result.glyphs[1].x).toBeCloseTo(6);
    });

    it('does not apply kerning when pair is absent', () => {
      const fontWithKerning = makeMockFont();
      fontWithKerning.kerning = new Map([[65, new Map([[86, -2]])]]); // A-V only

      const result = shapeText('AB', fontWithKerning, { fontSize: 32 });

      expect(result.glyphs[1].x).toBeCloseTo(8); // no kerning
    });
  });

  describe('multi-line (explicit \\n)', () => {
    it('creates a new line on \\n', () => {
      const result = shapeText('A\nB', font, { fontSize: 32 });

      expect(result.lines).toHaveLength(2);
      expect(result.glyphs[0].y).toBeCloseTo(4); // line 0
      expect(result.glyphs[1].y).toBeCloseTo(4 + 32); // line 1 (lineHeight=32)
    });

    it('accumulates bounds for multi-line text', () => {
      const result = shapeText('AB\nCD', font, { fontSize: 32 });

      expect(result.bounds.h).toBeCloseTo(64); // 2 lines × 32
    });
  });

  describe('word wrapping', () => {
    it('wraps at word boundary when line exceeds maxWidth', () => {
      // 'AB CD': AB = 16px, space = 4px, CD = 16px → 36px total
      // maxWidth = 20 → 'AB' fits (16), 'CD' goes to next line
      const result = shapeText('AB CD', font, {
        fontSize: 32,
        wrap: 'word',
        maxWidth: 20,
      });

      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].glyphs.map((g) => g.codepoint)).toEqual([65, 66]); // A, B
      expect(result.lines[1].glyphs.map((g) => g.codepoint)).toEqual([67, 68]); // C, D
    });

    it('keeps long words on their own line even if they exceed maxWidth', () => {
      const result = shapeText('ABCDE', font, {
        fontSize: 32,
        wrap: 'word',
        maxWidth: 10, // less than any word
      });

      // Single long word can't be broken by word wrap → stays on one line
      expect(result.lines).toHaveLength(1);
    });
  });

  describe('character wrapping', () => {
    it('breaks at character boundary when line exceeds maxWidth', () => {
      // 'ABCDE': each char = 8px, maxWidth = 20 → 2 chars per line + 1 remain
      const result = shapeText('ABCDE', font, {
        fontSize: 32,
        wrap: 'char',
        maxWidth: 20,
      });

      expect(result.lines).toHaveLength(3); // AB, CD, E
    });
  });

  describe('horizontal alignment', () => {
    it('left-aligns (default): glyph starts at x=0', () => {
      const result = shapeText('A', font, {
        fontSize: 32,
        align: 'left',
        maxWidth: 100,
      });

      expect(result.glyphs[0].x).toBeCloseTo(0);
    });

    it('center-aligns: glyph offset = (maxWidth - lineWidth) / 2', () => {
      // 'A' has advance 8, so lineWidth ≈ 8. maxWidth=100 → offset = 46
      const result = shapeText('A', font, {
        fontSize: 32,
        align: 'center',
        maxWidth: 100,
      });

      // line offset = (100 - 8) / 2 = 46; glyph.x = 46 + bearing.x(0) = 46
      expect(result.glyphs[0].x).toBeCloseTo(46);
    });

    it('right-aligns: glyph offset = maxWidth - lineWidth', () => {
      const result = shapeText('A', font, {
        fontSize: 32,
        align: 'right',
        maxWidth: 100,
      });

      // line offset = 100 - 8 = 92; glyph.x = 92 + 0 = 92
      expect(result.glyphs[0].x).toBeCloseTo(92);
    });
  });

  describe('vertical alignment', () => {
    it('top (default): first line starts at y ≈ bearing.y', () => {
      const result = shapeText('A', font, {
        fontSize: 32,
        verticalAlign: 'top',
        maxHeight: 200,
      });

      expect(result.glyphs[0].y).toBeCloseTo(4); // 0 + bearing.y
    });

    it('middle: text block is vertically centred in maxHeight', () => {
      // Single line height = 32. maxHeight = 200. verticalOffset = (200-32)/2 = 84
      const result = shapeText('A', font, {
        fontSize: 32,
        verticalAlign: 'middle',
        maxHeight: 200,
      });

      expect(result.glyphs[0].y).toBeCloseTo(84 + 4); // offset + bearing.y
    });

    it('bottom: text block flush to bottom of maxHeight', () => {
      // verticalOffset = 200-32 = 168
      const result = shapeText('A', font, {
        fontSize: 32,
        verticalAlign: 'bottom',
        maxHeight: 200,
      });

      expect(result.glyphs[0].y).toBeCloseTo(168 + 4);
    });
  });

  describe('overflow: ellipsis', () => {
    it('truncates text with ellipsis when lines exceed maxHeight', () => {
      // lineHeight=32, maxHeight=32 → only 1 line fits. Text has 2 lines.
      const result = shapeText('A\nB', font, {
        fontSize: 32,
        overflow: 'ellipsis',
        maxHeight: 32,
        maxWidth: 200,
      });

      expect(result.ellipsisApplied).toBe(true);
      expect(result.lines).toHaveLength(1);
      // Last glyph is the ellipsis (U+2026)
      const lastGlyph = result.glyphs[result.glyphs.length - 1];
      expect(lastGlyph.codepoint).toBe(0x2026);
    });

    it('truncates a long single line with ellipsis when it exceeds maxWidth', () => {
      // 'ABCDE' = 40px. maxWidth = 20px. Each char=8, ellipsis=8.
      // Fits: A (8) + ellipsis (8) = 16 ≤ 20 → A + ellipsis
      const result = shapeText('ABCDE', font, {
        fontSize: 32,
        overflow: 'ellipsis',
        maxWidth: 20,
        wrap: 'none',
      });

      expect(result.ellipsisApplied).toBe(true);
      const lastGlyph = result.glyphs[result.glyphs.length - 1];
      expect(lastGlyph.codepoint).toBe(0x2026);
    });

    it('does not apply ellipsis when text fits within bounds', () => {
      const result = shapeText('A', font, {
        fontSize: 32,
        overflow: 'ellipsis',
        maxWidth: 100,
        maxHeight: 100,
      });

      expect(result.ellipsisApplied).toBe(false);
    });
  });

  describe('bold / italic (separate atlas selection)', () => {
    it('uses glyphs from the bold font asset when a bold font is passed', () => {
      // Bold is represented by a different FontAsset with wider glyphs.
      const boldGlyph = makeGlyph(65, 10, 20, 0, 4, 10);
      const boldFont = makeMockFont(new Map([[65, boldGlyph]]));

      const result = shapeText('A', boldFont, { fontSize: 32 });

      expect(result.glyphs[0].width).toBeCloseTo(10);
      expect(result.glyphs[0].uvRect).toEqual(boldGlyph.uvRect);
    });
  });

  describe('multi-line bounds', () => {
    it('reports total height as lines × lineHeight', () => {
      const result = shapeText('A\nB\nC', font, { fontSize: 32 });

      expect(result.bounds.h).toBeCloseTo(96); // 3 × 32
    });

    it('reports bounds.w as the width of the widest line (no maxWidth)', () => {
      // Line 1: 'AB' = 16px; Line 2: 'A' = 8px
      const result = shapeText('AB\nA', font, { fontSize: 32 });

      expect(result.bounds.w).toBeCloseTo(16);
    });
  });
});
