import type { FontAsset, GlyphMetrics } from './types/font-asset.js';

/** Horizontal text alignment within the element's rect. */
export type TextAlign = 'left' | 'center' | 'right';

/** Vertical text alignment within the element's rect. */
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

/** How text is wrapped when it exceeds `maxWidth`. */
export type TextWrap = 'none' | 'word' | 'char';

/**
 * How text that overflows the element's bounds is handled.
 *
 * - `'visible'` — glyphs render beyond the element bounds.
 * - `'clip'` — the UI clip rect discards fragments outside the element.
 * - `'ellipsis'` — the last visible line is truncated with `…` (U+2026).
 */
export type TextOverflow = 'visible' | 'clip' | 'ellipsis';

/** Options for {@link shapeText}. */
export interface ShapeTextOptions {
  /** Display font size in pixels. Controls the overall scale relative to the atlas. */
  fontSize: number;

  /** Horizontal alignment of each line within `maxWidth`. Default `'left'`. */
  align?: TextAlign;

  /** Vertical alignment of the text block within `maxHeight`. Default `'top'`. */
  verticalAlign?: TextVerticalAlign;

  /**
   * Line-wrapping mode.  Default `'none'`.
   * Requires `maxWidth` to be set; ignored when `maxWidth` is not provided.
   */
  wrap?: TextWrap;

  /** Overflow handling mode. Default `'visible'`. */
  overflow?: TextOverflow;

  /**
   * Maximum width available for the text block in pixels.
   * Required for wrapping and horizontal alignment.
   */
  maxWidth?: number;

  /**
   * Maximum height available for the text block in pixels.
   * Required for vertical alignment and ellipsis truncation.
   */
  maxHeight?: number;
}

/** A positioned glyph within the shaped text output. */
export interface ShapedGlyph {
  /** Unicode codepoint of the glyph. */
  codepoint: number;

  /** Left edge in element-local pixels (top-left origin, +Y down). */
  x: number;

  /** Top edge in element-local pixels (top-left origin, +Y down). */
  y: number;

  /** Glyph display width in pixels. */
  width: number;

  /** Glyph display height in pixels. */
  height: number;

  /**
   * Normalised (0–1) UV rectangle within the atlas texture.
   * `x`/`y` = top-left; `w`/`h` = extent.
   */
  uvRect: { x: number; y: number; w: number; h: number };
}

/** A single shaped line, used for alignment and metrics. */
export interface ShapedTextLine {
  /** All positioned glyphs on this line. */
  glyphs: ShapedGlyph[];

  /** Total advance width of the line in pixels. */
  width: number;

  /** Y offset of the top of this line from the text block origin, in pixels. */
  y: number;
}

/** The output of {@link shapeText}: positioned glyph quads ready for rendering. */
export interface ShapedText {
  /** All positioned glyphs across all lines, in rendering order. */
  glyphs: ShapedGlyph[];

  /** Per-line breakdown (useful for selection, cursor placement, etc.). */
  lines: ShapedTextLine[];

  /** Bounding box of the shaped text in pixels. */
  bounds: { w: number; h: number };

  /** `true` when an ellipsis was appended due to overflow truncation. */
  ellipsisApplied: boolean;
}

const ELLIPSIS_CODEPOINT = 0x2026;
const SPACE_CODEPOINT = 0x0020;

const defaultShapeTextOptions: Required<ShapeTextOptions> = {
  fontSize: 16,
  align: 'left',
  verticalAlign: 'top',
  wrap: 'none',
  overflow: 'visible',
  maxWidth: Infinity,
  maxHeight: Infinity,
};

function getKerning(
  font: FontAsset,
  prevCodepoint: number,
  nextCodepoint: number,
): number {
  return font.kerning?.get(prevCodepoint)?.get(nextCodepoint) ?? 0;
}

/** Measures the display advance of a single glyph (with kerning from prev). */
function glyphAdvance(
  glyph: GlyphMetrics,
  prevCodepoint: number | null,
  font: FontAsset,
  scale: number,
): number {
  const kerning =
    prevCodepoint !== null
      ? getKerning(font, prevCodepoint, glyph.codepoint)
      : 0;

  return (glyph.advance + kerning) * scale;
}

/** Measures the total advance width of a run of codepoints. */
function measureRun(
  codepoints: number[],
  font: FontAsset,
  scale: number,
): number {
  let width = 0;
  let prev: number | null = null;

  for (const cp of codepoints) {
    const glyph = font.glyphs.get(cp);

    if (!glyph) {
      prev = cp;

      continue;
    }

    width += glyphAdvance(glyph, prev, font, scale);
    prev = cp;
  }

  return width;
}

/** Breaks a paragraph string (no `\n`) into lines by character. */
function charWrapParagraph(
  codepoints: number[],
  font: FontAsset,
  scale: number,
  maxWidth: number,
): number[][] {
  const lines: number[][] = [];
  let currentLine: number[] = [];
  let lineWidth = 0;

  for (const cp of codepoints) {
    const glyph = font.glyphs.get(cp);
    const advance = glyph
      ? glyphAdvance(
          glyph,
          currentLine[currentLine.length - 1] ?? null,
          font,
          scale,
        )
      : 0;

    if (currentLine.length > 0 && lineWidth + advance > maxWidth) {
      lines.push(currentLine);
      currentLine = [cp];
      lineWidth = advance;
    } else {
      currentLine.push(cp);
      lineWidth += advance;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/** Breaks a paragraph string (no `\n`) into lines by word. */
function wordWrapParagraph(
  codepoints: number[],
  font: FontAsset,
  scale: number,
  maxWidth: number,
): number[][] {
  const lines: number[][] = [];
  const words: number[][] = [];
  let current: number[] = [];

  for (const cp of codepoints) {
    if (cp === SPACE_CODEPOINT) {
      if (current.length > 0) {
        words.push(current);
        current = [];
      }

      words.push([SPACE_CODEPOINT]);
    } else {
      current.push(cp);
    }
  }

  if (current.length > 0) {
    words.push(current);
  }

  let lineCodepoints: number[] = [];
  let lineWidth = 0;

  for (const word of words) {
    const wordWidth = measureRun(word, font, scale);

    if (
      lineCodepoints.length > 0 &&
      lineWidth + wordWidth > maxWidth &&
      word[0] !== SPACE_CODEPOINT
    ) {
      lines.push(lineCodepoints);
      lineCodepoints = [...word];
      lineWidth = wordWidth;
    } else {
      lineCodepoints = [...lineCodepoints, ...word];
      lineWidth += wordWidth;
    }
  }

  if (lineCodepoints.length > 0) {
    lines.push(lineCodepoints);
  }

  return lines;
}

/** Converts a string to an array of Unicode codepoints. */
function toCodepoints(text: string): number[] {
  const codepoints: number[] = [];

  for (const char of text) {
    const cp = char.codePointAt(0);

    if (cp !== undefined) {
      codepoints.push(cp);
    }
  }

  return codepoints;
}

/** Returns the advance for a space codepoint, falling back to a fraction of lineHeight. */
function spaceAdvance(font: FontAsset, scale: number): number {
  const spaceGlyph = font.glyphs.get(SPACE_CODEPOINT);

  return spaceGlyph
    ? spaceGlyph.advance * scale
    : font.lineHeight * scale * 0.25;
}

/** Pushes a visible shaped glyph onto `out` if it has non-zero dimensions. */
function pushShapedGlyph(
  out: ShapedGlyph[],
  glyph: GlyphMetrics,
  cp: number,
  x: number,
  y: number,
  scale: number,
): void {
  const w = glyph.size.w * scale;
  const h = glyph.size.h * scale;

  if (w > 0 && h > 0) {
    out.push({
      codepoint: cp,
      x,
      y,
      width: w,
      height: h,
      uvRect: { ...glyph.uvRect },
    });
  }
}

/** Shapes a single line of codepoints into positioned glyphs at `lineY`. */
function shapeLine(
  codepoints: number[],
  font: FontAsset,
  scale: number,
  lineY: number,
  lineOffsetX: number,
): { glyphs: ShapedGlyph[]; width: number } {
  const glyphs: ShapedGlyph[] = [];
  let cursorX = lineOffsetX;
  let prev: number | null = null;

  for (const cp of codepoints) {
    const kerning = prev !== null ? getKerning(font, prev, cp) * scale : 0;
    cursorX += kerning;

    if (cp === SPACE_CODEPOINT) {
      cursorX += spaceAdvance(font, scale);
      prev = SPACE_CODEPOINT;

      continue;
    }

    const glyph = font.glyphs.get(cp);

    if (!glyph) {
      prev = cp;

      continue;
    }

    pushShapedGlyph(
      glyphs,
      glyph,
      cp,
      cursorX + glyph.bearing.x * scale,
      lineY + glyph.bearing.y * scale,
      scale,
    );

    cursorX += glyph.advance * scale;
    prev = cp;
  }

  return { glyphs, width: cursorX - lineOffsetX };
}

/** Finds the last codepoint sequence that fits within `maxWidth`, appending an ellipsis. */
function applyEllipsis(
  codepoints: number[],
  font: FontAsset,
  scale: number,
  maxWidth: number,
): number[] {
  const ellipsisGlyph = font.glyphs.get(ELLIPSIS_CODEPOINT);
  const ellipsisWidth = ellipsisGlyph
    ? ellipsisGlyph.advance * scale
    : (font.glyphs.get(SPACE_CODEPOINT)?.advance ?? 0);

  let width = 0;
  let prev: number | null = null;
  const result: number[] = [];

  for (const cp of codepoints) {
    const glyph = font.glyphs.get(cp);
    const advance = glyph ? glyphAdvance(glyph, prev, font, scale) : 0;

    if (width + advance + ellipsisWidth > maxWidth) {
      break;
    }

    result.push(cp);
    width += advance;
    prev = cp;
  }

  result.push(ELLIPSIS_CODEPOINT);

  return result;
}

/** Wraps a single paragraph's codepoints into lines according to the wrap mode. */
function wrapParagraph(
  codepoints: number[],
  font: FontAsset,
  scale: number,
  wrap: TextWrap,
  maxWidth: number,
): number[][] {
  if (wrap === 'word' && maxWidth !== Infinity) {
    return wordWrapParagraph(codepoints, font, scale, maxWidth);
  }

  if (wrap === 'char' && maxWidth !== Infinity) {
    return charWrapParagraph(codepoints, font, scale, maxWidth);
  }

  return [codepoints];
}

/** Splits `text` on `\n` and applies wrap mode, producing all line codepoint arrays. */
function buildAllLines(
  text: string,
  font: FontAsset,
  scale: number,
  wrap: TextWrap,
  maxWidth: number,
): number[][] {
  const lines: number[][] = [];

  for (const para of text.split('\n')) {
    lines.push(
      ...wrapParagraph(toCodepoints(para), font, scale, wrap, maxWidth),
    );
  }

  return lines;
}

interface EllipsisResult {
  lines: number[][];
  applied: boolean;
}

/** Applies ellipsis truncation (by height then by width) and returns updated lines. */
function applyEllipsisToLines(
  allLines: number[][],
  font: FontAsset,
  scale: number,
  lineHeightPx: number,
  maxWidth: number,
  maxHeight: number,
): EllipsisResult {
  let lines = allLines;

  // Vertical truncation first.
  if (maxHeight !== Infinity) {
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeightPx));

    if (allLines.length > maxLines) {
      lines = allLines.slice(0, maxLines);
      const lastIdx = lines.length - 1;
      lines[lastIdx] = applyEllipsis(
        lines[lastIdx],
        font,
        scale,
        maxWidth !== Infinity ? maxWidth : Infinity,
      );

      return { lines, applied: true };
    }
  }

  // Horizontal truncation if last line overflows maxWidth.
  if (maxWidth !== Infinity) {
    const lastIdx = lines.length - 1;

    if (measureRun(lines[lastIdx], font, scale) > maxWidth) {
      lines = [...lines];
      lines[lastIdx] = applyEllipsis(lines[lastIdx], font, scale, maxWidth);

      return { lines, applied: true };
    }
  }

  return { lines, applied: false };
}

/** Computes the vertical baseline offset for the text block. */
function computeVerticalOffset(
  verticalAlign: TextVerticalAlign,
  maxHeight: number,
  totalHeight: number,
): number {
  if (verticalAlign === 'middle' && maxHeight !== Infinity) {
    return (maxHeight - totalHeight) / 2;
  }

  if (verticalAlign === 'bottom' && maxHeight !== Infinity) {
    return maxHeight - totalHeight;
  }

  return 0;
}

/** Computes the horizontal X offset for a line given its width and alignment. */
function computeLineOffsetX(
  align: TextAlign,
  maxWidth: number,
  lineWidth: number,
): number {
  if (align === 'center' && maxWidth !== Infinity) {
    return (maxWidth - lineWidth) / 2;
  }

  if (align === 'right' && maxWidth !== Infinity) {
    return maxWidth - lineWidth;
  }

  return 0;
}

interface AssembleLinesLayout {
  lineHeightPx: number;
  verticalOffset: number;
  align: TextAlign;
  maxWidth: number;
}

/** Shapes all lines into final glyph arrays and line records. */
function assembleLines(
  linesToRender: number[][],
  lineWidths: number[],
  layout: AssembleLinesLayout,
  font: FontAsset,
  scale: number,
): { shapedLines: ShapedTextLine[]; allGlyphs: ShapedGlyph[] } {
  const shapedLines: ShapedTextLine[] = [];
  const allGlyphs: ShapedGlyph[] = [];
  const { lineHeightPx, verticalOffset, align, maxWidth } = layout;

  for (let i = 0; i < linesToRender.length; i++) {
    const lineY = i * lineHeightPx + verticalOffset;
    const lineOffsetX = computeLineOffsetX(align, maxWidth, lineWidths[i]);
    const { glyphs: lineGlyphs, width } = shapeLine(
      linesToRender[i],
      font,
      scale,
      lineY,
      lineOffsetX,
    );

    shapedLines.push({ glyphs: lineGlyphs, width, y: lineY });
    allGlyphs.push(...lineGlyphs);
  }

  return { shapedLines, allGlyphs };
}

/**
 * Converts `(text, font, options)` into a set of positioned glyph quads.
 *
 * This is the pure text-shaping core — it performs no WebGL calls and can be
 * unit-tested without a render context.  Shaped glyphs are in element-local
 * pixels (top-left origin, +Y down), scaled to the requested `fontSize`.
 *
 * @param text - The string to shape. Use `\n` for explicit line breaks.
 * @param font - The loaded font asset.
 * @param options - Font size, alignment, wrapping, and overflow options.
 * @returns A {@link ShapedText} ready to be uploaded as instance data.
 */
export function shapeText(
  text: string,
  font: FontAsset,
  options: ShapeTextOptions,
): ShapedText {
  const {
    fontSize,
    align,
    verticalAlign,
    wrap,
    overflow,
    maxWidth,
    maxHeight,
  } = { ...defaultShapeTextOptions, ...options };

  const scale = fontSize / font.lineHeight;
  const lineHeightPx = font.lineHeight * scale;

  const allLineCodepoints = buildAllLines(text, font, scale, wrap, maxWidth);

  let linesToRender = allLineCodepoints;
  let ellipsisApplied = false;

  if (overflow === 'ellipsis') {
    const result = applyEllipsisToLines(
      allLineCodepoints,
      font,
      scale,
      lineHeightPx,
      maxWidth,
      maxHeight,
    );

    linesToRender = result.lines;
    ellipsisApplied = result.applied;
  }

  const lineWidths = linesToRender.map((cps) => measureRun(cps, font, scale));
  const totalHeight = linesToRender.length * lineHeightPx;
  const verticalOffset = computeVerticalOffset(
    verticalAlign,
    maxHeight,
    totalHeight,
  );

  const { shapedLines, allGlyphs } = assembleLines(
    linesToRender,
    lineWidths,
    { lineHeightPx, verticalOffset, align, maxWidth },
    font,
    scale,
  );

  const boundsW = maxWidth !== Infinity ? maxWidth : Math.max(0, ...lineWidths);

  return {
    glyphs: allGlyphs,
    lines: shapedLines,
    bounds: { w: boundsW, h: totalHeight },
    ellipsisApplied,
  };
}
