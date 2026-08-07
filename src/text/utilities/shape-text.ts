import {
  FontAtlas,
  FontAtlasGlyph,
  getKerningKey,
} from '../../asset-loading/index.js';
import { Vector2 } from '../../math/index.js';
import { GlyphQuad } from '../components/text-mesh-component.js';
import { TextAlignment } from '../components/text-component.js';

/**
 * Options for {@link shapeText}, mirroring `TextEcsComponent`'s
 * shape-affecting fields.
 */
export interface ShapeTextOptions {
  /** How each line is horizontally positioned. Defaults to `'left'`. */
  alignment?: TextAlignment;

  /**
   * The width, in world units, that lines wrap to fit within, breaking
   * between words (not mid-word - a single word wider than `wrapWidth` is
   * still placed on its own line, unbroken). Omit for a single unwrapped
   * line per `\n` in `text`.
   */
  wrapWidth?: number;

  /** A multiplier over `font.lineHeight`. Defaults to `1`. */
  lineSpacing?: number;

  /** The text block's origin, normalized to its own size. Defaults to `(0.5, 0.5)`. */
  pivot?: Vector2;
}

/** The result of {@link shapeText}. */
export interface ShapedText {
  /** One quad per visible (non-whitespace, in-atlas) character. */
  glyphs: GlyphQuad[];

  /**
   * The text block's overall size, in world units: the widest line's width
   * (or `wrapWidth`, if given) and the full line-height stack's height.
   */
  bounds: Vector2;
}

const defaultShapeTextOptions = {
  alignment: 'left' as TextAlignment,
  lineSpacing: 1,
};

/**
 * Walks `line`'s characters left to right, applying each glyph's kerning
 * (against the previous placed glyph) and advance, in em-to-world-unit
 * `scale`. Characters with no matching glyph in `font` are skipped (no
 * advance) - a font missing a character has no way to represent it.
 * @param line - The line to lay out (must not contain `\n`).
 * @param font - The font atlas to look up glyphs and kerning in.
 * @param scale - The em-to-world-unit scale factor (`fontSize / font.emSize`).
 * @param onGlyph - Invoked for each placed glyph, with its code point, its
 * atlas metrics, and its cursor position (the pen position immediately
 * before this glyph, in world units, before its own advance is applied).
 * @returns The line's total advance width, in world units.
 */
function layoutLine(
  line: string,
  font: FontAtlas,
  scale: number,
  onGlyph?: (codePoint: number, glyph: FontAtlasGlyph, cursorX: number) => void,
): number {
  let cursorX = 0;
  let previousCodePoint: number | null = null;

  for (const character of line) {
    // `codePointAt` (not charCodeAt/index access) so a surrogate-pair
    // character (e.g. most emoji) resolves to one code point, matching how
    // `for...of` already iterated by code point rather than UTF-16 unit.
    const codePoint = character.codePointAt(0)!;
    const glyph = font.glyphs.get(codePoint);

    if (!glyph) {
      previousCodePoint = null;

      continue;
    }

    if (previousCodePoint !== null) {
      const kerning =
        font.kerning.get(getKerningKey(previousCodePoint, codePoint)) ?? 0;

      cursorX += kerning * scale;
    }

    onGlyph?.(codePoint, glyph, cursorX);

    cursorX += glyph.advance * scale;
    previousCodePoint = codePoint;
  }

  return cursorX;
}

/**
 * Greedily word-wraps `paragraph` (a single line's worth of source text,
 * already split on `\n`) to fit within `wrapWidth`, breaking between words.
 * A word wider than `wrapWidth` on its own is still placed on its own line,
 * unbroken. Collapses runs of spaces to a single space between words -
 * word-wrapping re-flows the text anyway, so original whitespace runs
 * aren't preserved (unlike the no-`wrapWidth` case, which uses `paragraph`
 * verbatim).
 * @param paragraph - The paragraph to wrap.
 * @param font - The font atlas to measure candidate lines against.
 * @param scale - The em-to-world-unit scale factor.
 * @param wrapWidth - The width, in world units, to wrap within.
 * @returns The wrapped lines.
 */
function wrapParagraph(
  paragraph: string,
  font: FontAtlas,
  scale: number,
  wrapWidth: number,
): string[] {
  const words = paragraph.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (currentLine !== '' && layoutLine(candidate, font, scale) > wrapWidth) {
      lines.push(currentLine);
      currentLine = word;

      continue;
    }

    currentLine = candidate;
  }

  lines.push(currentLine);

  return lines;
}

function computeLines(
  text: string,
  font: FontAtlas,
  scale: number,
  wrapWidth: number | undefined,
): string[] {
  const paragraphs = text.split('\n');

  if (wrapWidth === undefined) {
    return paragraphs;
  }

  return paragraphs.flatMap((paragraph) =>
    wrapParagraph(paragraph, font, scale, wrapWidth),
  );
}

function alignmentOffset(
  alignment: TextAlignment,
  blockWidth: number,
  lineWidth: number,
): number {
  if (alignment === 'center') {
    return (blockWidth - lineWidth) / 2;
  }

  if (alignment === 'right') {
    return blockWidth - lineWidth;
  }

  return 0;
}

/**
 * Shapes `text` into glyph quads ready for the render system: word-wrapping
 * (if `wrapWidth` is given), applying kerning, and laying out lines
 * according to `alignment`, `lineSpacing`, and `pivot`.
 *
 * Coordinates follow the same convention as `computeNineSliceRegions`
 * (`/rendering`): each glyph's `offset` is relative to the text block's
 * pivot-adjusted anchor, in the engine's Y-up world-unit space, ready to be
 * rotated/scaled and added to an entity's world position.
 * @param text - The string to shape. Explicit `\n` characters start a new
 * line.
 * @param font - The font atlas to shape against.
 * @param fontSize - The font size, in world units, that `font`'s
 * em-normalized metrics are scaled by.
 * @param options - Shaping options.
 * @returns The shaped glyph quads and the text block's overall bounds.
 */
export function shapeText(
  text: string,
  font: FontAtlas,
  fontSize: number,
  options: ShapeTextOptions = {},
): ShapedText {
  const { alignment, wrapWidth, lineSpacing, pivot } = {
    ...defaultShapeTextOptions,
    pivot: { x: 0.5, y: 0.5 },
    ...options,
  };

  const scale = fontSize / (font.emSize || 1);
  const lines = computeLines(text, font, scale, wrapWidth);
  const lineWidths = lines.map((line) => layoutLine(line, font, scale));
  const blockWidth = wrapWidth ?? Math.max(0, ...lineWidths);
  const rowHeight = font.lineHeight * lineSpacing * scale;
  const blockHeight = lines.length * rowHeight;

  const glyphs: GlyphQuad[] = [];

  lines.forEach((line, lineIndex) => {
    const lineOffsetX = alignmentOffset(
      alignment,
      blockWidth,
      lineWidths[lineIndex],
    );
    // Y-down, row 0 at the block's top edge - matching `NineSliceRegion`'s
    // "start" convention before the pivot subtraction below converts it to
    // the engine's Y-up world space.
    const baselineDown = lineIndex * rowHeight + font.ascender * scale;

    layoutLine(line, font, scale, (_codePoint, glyph, cursorX) => {
      if (!glyph.planeBounds || !glyph.uvOffset || !glyph.uvScale) {
        return;
      }

      const left = lineOffsetX + cursorX + glyph.planeBounds.left * scale;
      const right = lineOffsetX + cursorX + glyph.planeBounds.right * scale;
      const topDown = baselineDown - glyph.planeBounds.top * scale;
      const bottomDown = baselineDown - glyph.planeBounds.bottom * scale;

      glyphs.push({
        offset: {
          x: (left + right) / 2 - pivot.x * blockWidth,
          y: pivot.y * blockHeight - (topDown + bottomDown) / 2,
        },
        size: { x: right - left, y: bottomDown - topDown },
        uvOffset: glyph.uvOffset,
        uvScale: glyph.uvScale,
      });
    });
  });

  return {
    glyphs,
    bounds: { x: blockWidth, y: blockHeight },
  };
}
