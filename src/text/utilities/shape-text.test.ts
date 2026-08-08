import { describe, expect, it } from 'vitest';
import { shapeText } from './shape-text.js';
import type { FontAtlas } from '../../asset-loading/index.js';

/**
 * A tiny synthetic font: "A" and "V" are 1 em wide/tall monospace-ish
 * glyphs, "V" following "A" kerns -0.2em tighter, and space just advances.
 */
function createFont(overrides: Partial<FontAtlas> = {}): FontAtlas {
  return {
    image: {} as HTMLImageElement,
    atlasWidth: 100,
    atlasHeight: 100,
    distanceRange: 4,
    emSize: 1,
    lineHeight: 1,
    ascender: 0.8,
    descender: -0.2,
    glyphs: new Map([
      [
        65, // 'A'
        {
          advance: 1,
          planeBounds: { left: 0, bottom: 0, right: 1, top: 1 },
          uvOffset: { x: 0, y: 0 },
          uvScale: { x: 0.1, y: 0.1 },
        },
      ],
      [
        86, // 'V'
        {
          advance: 1,
          planeBounds: { left: 0, bottom: 0, right: 1, top: 1 },
          uvOffset: { x: 0.1, y: 0 },
          uvScale: { x: 0.1, y: 0.1 },
        },
      ],
      [
        32, // ' '
        { advance: 0.5 },
      ],
    ]),
    kerning: new Map([['65:86', -0.2]]),
    ...overrides,
  };
}

describe('shapeText', () => {
  it('produces one glyph per visible character', () => {
    const shaped = shapeText('AA', createFont(), 10);

    expect(shaped.glyphs).toHaveLength(2);
  });

  it('scales glyph size by fontSize / emSize', () => {
    const font = createFont({ emSize: 2 });
    const shaped = shapeText('A', font, 10);

    // planeBounds spans 0..1 em; scale = fontSize / emSize = 5.
    expect(shaped.glyphs[0].size).toEqual({ x: 5, y: 5 });
  });

  it('produces no glyph quad for whitespace, but still advances the cursor', () => {
    const shaped = shapeText('A A', createFont(), 10);

    expect(shaped.glyphs).toHaveLength(2);
    // Second 'A' advance: 1 (first A) + 0.5 (space) = 1.5em * 10 = 15.
    expect(shaped.glyphs[1].offset.x).toBeGreaterThan(
      shaped.glyphs[0].offset.x,
    );
  });

  it('skips characters missing from the font atlas without throwing', () => {
    expect(() => shapeText('A?A', createFont(), 10)).not.toThrow();

    const shaped = shapeText('A?A', createFont(), 10);

    expect(shaped.glyphs).toHaveLength(2);
  });

  it('applies kerning between consecutive glyphs', () => {
    const withKerning = shapeText('AV', createFont(), 10);
    const withoutKerningFont = createFont({ kerning: new Map() });
    const withoutKerning = shapeText('AV', withoutKerningFont, 10);

    // Kerning is -0.2em * fontSize(10) = -2 tighter, so the second glyph's
    // offset should be 2 units further left with kerning applied.
    expect(withKerning.glyphs[1].offset.x).toBeLessThan(
      withoutKerning.glyphs[1].offset.x,
    );
  });

  it('does not apply kerning across a line break', () => {
    const font = createFont();
    const shapedTwoLines = shapeText('A\nV', font, 10);

    expect(shapedTwoLines.glyphs).toHaveLength(2);
    // The 'V' on line 2 starts a fresh cursor (x relative to its own line),
    // so it isn't pulled left by the A-V kerning pair the way it would be
    // on a single line.
    const shapedOneLine = shapeText('AV', font, 10);
    const kernedOffset = shapedOneLine.glyphs[1].offset.x;

    expect(shapedTwoLines.glyphs[1].offset.x).not.toBe(kernedOffset);
  });

  describe('bounds', () => {
    it('computes width as the widest line when no wrapWidth is given', () => {
      const shaped = shapeText('AA\nA', createFont(), 10);

      // 'AA' is 2em wide * 10 = 20; 'A' alone is 10.
      expect(shaped.bounds.x).toBe(20);
    });

    it('computes height as lines * lineHeight * lineSpacing * fontSize', () => {
      const shaped = shapeText('A\nA\nA', createFont(), 10, {
        lineSpacing: 2,
      });

      // font.lineHeight = 1, so height = 3 lines * 1 * 2 * 10 = 60.
      expect(shaped.bounds.y).toBe(60);
    });

    it('uses wrapWidth as the block width when given', () => {
      const shaped = shapeText('A', createFont(), 10, { wrapWidth: 50 });

      expect(shaped.bounds.x).toBe(50);
    });
  });

  describe('word wrapping', () => {
    it('does not wrap when wrapWidth is omitted, however long the line', () => {
      const shaped = shapeText('A A A A A A A A A A', createFont(), 10);

      // 19 characters (10 'A's + 9 spaces) all placed as visible or
      // whitespace on a single unwrapped line: 10 visible glyphs.
      expect(shaped.glyphs).toHaveLength(10);
      expect(shaped.bounds.y).toBe(10); // one line only
    });

    it('wraps between words to fit wrapWidth', () => {
      // Each "A A" pair is 1.5em wide; with fontSize 10 that's 15 units.
      // A wrapWidth of 20 allows one word (10 units) but not two per line.
      const shaped = shapeText('A A A', createFont(), 10, { wrapWidth: 20 });

      // 3 lines of one 'A' each -> height = 3 * 1 * 1 * 10 = 30.
      expect(shaped.bounds.y).toBe(30);
    });

    it('places a single word wider than wrapWidth on its own line, unbroken', () => {
      const shaped = shapeText('AA', createFont(), 10, { wrapWidth: 5 });

      expect(shaped.glyphs).toHaveLength(2);
      expect(shaped.bounds.y).toBe(10); // still a single line
    });

    it('preserves explicit line breaks alongside wrapping', () => {
      const shaped = shapeText('A A\nA', createFont(), 10, { wrapWidth: 30 });

      // "A A" is A(1em) + space(0.5em) + A(1em) = 2.5em wide, 25 units at
      // fontSize 10, which fits within a 30-unit wrapWidth as one line;
      // "A" from the explicit break is a second line -> 2 lines total.
      expect(shaped.bounds.y).toBe(20);
    });
  });

  describe('alignment', () => {
    it('left-aligns by default, starting every line at x = 0 (before pivot)', () => {
      const shaped = shapeText('AA\nA', createFont(), 10, {
        wrapWidth: 20,
        pivot: { x: 0, y: 0 },
      });

      const firstGlyphOfEachLine = [shaped.glyphs[0], shaped.glyphs[2]];

      for (const glyph of firstGlyphOfEachLine) {
        expect(glyph.offset.x).toBeCloseTo(glyph.size.x / 2);
      }
    });

    it('center-aligns shorter lines within the block width', () => {
      const shaped = shapeText('AA\nA', createFont(), 10, {
        alignment: 'center',
        pivot: { x: 0, y: 0 },
      });

      // Block width is 20 (the "AA" line). The lone "A" line (10 wide)
      // should be centered, starting at x = 5 instead of x = 0.
      const secondLineGlyph = shaped.glyphs[2];

      expect(secondLineGlyph.offset.x).toBeCloseTo(
        5 + secondLineGlyph.size.x / 2,
      );
    });

    it('right-aligns shorter lines within the block width', () => {
      const shaped = shapeText('AA\nA', createFont(), 10, {
        alignment: 'right',
        pivot: { x: 0, y: 0 },
      });

      const secondLineGlyph = shaped.glyphs[2];

      expect(secondLineGlyph.offset.x).toBeCloseTo(
        10 + secondLineGlyph.size.x / 2,
      );
    });
  });

  describe('pivot', () => {
    it('defaults to the block center (0.5, 0.5)', () => {
      const centered = shapeText('A', createFont(), 10);
      const bottomLeft = shapeText('A', createFont(), 10, {
        pivot: { x: 0, y: 0 },
      });

      expect(centered.glyphs[0].offset.x).toBeLessThan(
        bottomLeft.glyphs[0].offset.x,
      );
    });

    it('offsets every glyph by pivot * bounds, Y-up like SpriteEcsComponent.pivot', () => {
      const bottomLeft = shapeText('AA', createFont(), 10, {
        pivot: { x: 0, y: 0 },
      });
      const topRight = shapeText('AA', createFont(), 10, {
        pivot: { x: 1, y: 1 },
      });

      const { bounds } = bottomLeft;

      expect(topRight.glyphs[0].offset.x).toBeCloseTo(
        bottomLeft.glyphs[0].offset.x - bounds.x,
      );
      // pivot.y = 1 means top (Y-up), so it shifts the block down (offset.y
      // decreases) relative to pivot.y = 0 (bottom) - the opposite sign
      // from offset.x, since a higher pivot.x (more "right") shifts the
      // block left the same way a higher pivot.y (more "top") shifts it down.
      expect(topRight.glyphs[0].offset.y).toBeCloseTo(
        bottomLeft.glyphs[0].offset.y - bounds.y,
      );
    });
  });

  describe('uv rects', () => {
    it("passes through each glyph's uvOffset/uvScale from the font atlas unchanged", () => {
      const shaped = shapeText('AV', createFont(), 10);

      expect(shaped.glyphs[0].uvOffset).toEqual({ x: 0, y: 0 });
      expect(shaped.glyphs[0].uvScale).toEqual({ x: 0.1, y: 0.1 });
      expect(shaped.glyphs[1].uvOffset).toEqual({ x: 0.1, y: 0 });
    });
  });
});
