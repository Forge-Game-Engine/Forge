import type { GlyphQuad } from '../components/text-mesh-component.js';
import {
  type FontAtlasData,
  getKerningPairKey,
} from '../font-atlas/font-atlas-data.js';

/**
 * Options for {@link shapeText}. Mirrors the shape-relevant subset of
 * `TextEcsComponent`.
 */
export interface ShapeTextOptions {
  /** Font size, in world units - the rendered em height. */
  size: number;

  /**
   * Extra spacing between glyphs, in world units, added to each glyph's
   * advance. Defaults to `0`.
   */
  letterSpacing?: number;

  /** Multiplier on the font's authored line height. Defaults to `1`. */
  lineHeight?: number;

  /**
   * Horizontal alignment of each line within the shaped block's own width.
   * Defaults to `'left'`. Irrelevant, and ignored, when `maxWidth` is unset.
   */
  horizontalAlign?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Vertical alignment of the whole shaped block relative to its anchor
   * (the origin every glyph offset is relative to). Defaults to `'top'`.
   */
  verticalAlign?: 'top' | 'middle' | 'bottom';

  /**
   * Wraps at word boundaries when a line would exceed this width, in world
   * units. `undefined` (the default) never wraps.
   */
  maxWidth?: number;
}

/** The pure-data result of shaping a string against a `FontAtlasData`. */
export interface ShapedText {
  /** One entry per visible glyph, across every line. */
  glyphs: GlyphQuad[];

  /** The shaped block's own bounds, in world units. */
  bounds: { width: number; height: number };
}

const defaultShapeTextOptions = {
  letterSpacing: 0,
  lineHeight: 1,
  horizontalAlign: 'left' as const,
  verticalAlign: 'top' as const,
};

/** A single word's shaped glyphs, positioned relative to the word's own start (x = 0). */
interface ShapedWord {
  glyphs: GlyphQuad[];
  width: number;
}

/** A word placed within a line, at `startX` from the line's own (unaligned) start. */
interface LineWord {
  word: ShapedWord;
  startX: number;
}

/** One wrapped line: its placed words and their combined, unaligned content width. */
interface ShapedLine {
  words: LineWord[];
  width: number;
}

/**
 * Shapes a single word's code points into glyph quads via an advance +
 * kerning walk, positioning each visible glyph centered on its
 * baseline-relative plane bounds (matching `NineSliceRegion.offset`'s "quad
 * center" convention, since glyph quads are drawn through the same
 * pivot-0.5 sprite machinery). Kerning is scoped to this word only - it
 * never carries over from whatever preceded it - so a word's shape (and
 * therefore its width) never depends on its position in the line, which is
 * what lets {@link wrapIntoLines} reuse this same walk for both the
 * word-wrap width check and the glyphs it ultimately emits, with no second
 * measurement pass.
 * @param word - The word's code points, with no whitespace.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param size - Font size, in world units.
 * @param letterSpacing - Extra spacing between glyphs, in world units.
 * @returns The word's glyph quads (relative to the word's own start) and width.
 */
function shapeWord(
  word: string,
  fontAtlasData: FontAtlasData,
  size: number,
  letterSpacing: number,
): ShapedWord {
  const glyphs: GlyphQuad[] = [];
  let penX = 0;
  let previousCodePoint: number | null = null;

  for (const character of word) {
    const codePoint = character.codePointAt(0) as number;
    const glyph = fontAtlasData.glyphs.get(codePoint);

    if (!glyph) {
      previousCodePoint = null;

      continue;
    }

    if (previousCodePoint !== null) {
      const kerningKey = getKerningPairKey(previousCodePoint, codePoint);

      // Kerning, like `GlyphMetrics.advance`, is expressed in em units (the
      // same dimensionless convention the rest of `FontAtlasData` uses), so
      // it must be scaled by `size` exactly like advance is below -
      // otherwise the same font rendered bigger wouldn't kern
      // proportionally further apart.
      penX += (fontAtlasData.kerning.get(kerningKey) ?? 0) * size;
    }

    if (glyph.planeBounds && glyph.atlasBounds) {
      const { planeBounds, atlasBounds } = glyph;
      const glyphWidth = (planeBounds.right - planeBounds.left) * size;
      const glyphHeight = (planeBounds.top - planeBounds.bottom) * size;

      // A UV rect that touches its tile's exact edge samples 50/50 with the
      // next glyph's tile under GL_LINEAR (texture coordinates exactly at a
      // texel boundary blend the texels on both sides of it) - visible as a
      // faint "ghost" of the neighboring glyph, worse the more the glyph is
      // minified on screen. Insetting by a texel keeps every sample a full
      // texel away from the boundary; `generate-font-atlas.mjs` always pads
      // each glyph's tile by at least `distanceRange / 2` (>= 1px for any
      // supported distanceRange), so this never eats into real ink.
      const insetX = 1 / fontAtlasData.atlasSize.width;
      const insetY = 1 / fontAtlasData.atlasSize.height;
      const atlasLeft = atlasBounds.left + insetX;
      const atlasRight = atlasBounds.right - insetX;
      const atlasBottom = atlasBounds.bottom + insetY;
      const atlasTop = atlasBounds.top - insetY;

      glyphs.push({
        offset: {
          x: penX + (planeBounds.left * size + glyphWidth / 2),
          y: planeBounds.bottom * size + glyphHeight / 2,
        },
        size: { x: glyphWidth, y: glyphHeight },
        // `atlasBounds` is Y-up (`top` > `bottom`, matching `planeBounds`),
        // but UV sampling in this engine is Y-down (v=0 is the top of the
        // texture - see `computeNineSliceRegions`'s `uvOffset`, documented
        // as the region's top-left corner). `1 - atlasTop` converts the
        // glyph's (inset) top edge to its Y-down v.
        uvOffset: { x: atlasLeft, y: 1 - atlasTop },
        uvScale: {
          x: atlasRight - atlasLeft,
          y: atlasTop - atlasBottom,
        },
      });
    }

    penX += (glyph.advance + letterSpacing) * size;
    previousCodePoint = codePoint;
  }

  return { glyphs, width: Math.max(0, penX) };
}

/**
 * Sums the advance of a run of whitespace characters, in world units. Never
 * kerns and never applies `letterSpacing` - whitespace is pure spacing
 * between words, not a glyph a reader perceives spacing "around".
 * @param whitespace - A run of whitespace characters.
 * @param fontAtlasData - The font atlas metrics to look up advances in.
 * @param size - Font size, in world units.
 * @returns The whitespace run's total advance.
 */
function getWhitespaceAdvance(
  whitespace: string,
  fontAtlasData: FontAtlasData,
  size: number,
): number {
  let advance = 0;

  for (const character of whitespace) {
    const codePoint = character.codePointAt(0) as number;
    const glyph = fontAtlasData.glyphs.get(codePoint);

    if (glyph) {
      advance += glyph.advance * size;
    }
  }

  return advance;
}

/**
 * Greedily wraps `text` into lines at word boundaries: a word is appended to
 * the current line unless doing so would exceed `maxWidth` and the line
 * already has at least one word, in which case a new line starts with that
 * word instead. A single word wider than `maxWidth` on its own is never
 * split mid-word - it simply overflows its own line.
 * @param text - The full string to wrap. A single call always returns at
 * least one (possibly empty) line.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param size - Font size, in world units.
 * @param letterSpacing - Extra spacing between glyphs, in world units.
 * @param maxWidth - The width to wrap at, in world units, or `undefined` to
 * never wrap (the whole string becomes one line).
 * @returns The wrapped lines, each with its placed words and content width.
 */
function wrapIntoLines(
  text: string,
  fontAtlasData: FontAtlasData,
  size: number,
  letterSpacing: number,
  maxWidth: number | undefined,
): ShapedLine[] {
  const tokens = text.split(/(\s+)/).filter((token) => token.length > 0);
  const lines: ShapedLine[] = [];

  let currentWords: LineWord[] = [];
  let penX = 0;
  let lineContentWidth = 0;

  const commitLine = (): void => {
    lines.push({ words: currentWords, width: lineContentWidth });
    currentWords = [];
    penX = 0;
    lineContentWidth = 0;
  };

  for (const token of tokens) {
    if (/^\s/.test(token)) {
      penX += getWhitespaceAdvance(token, fontAtlasData, size);

      continue;
    }

    const word = shapeWord(token, fontAtlasData, size, letterSpacing);

    if (
      maxWidth !== undefined &&
      currentWords.length > 0 &&
      penX + word.width > maxWidth
    ) {
      commitLine();
    }

    currentWords.push({ word, startX: penX });
    penX += word.width;
    lineContentWidth = penX;
  }

  commitLine();

  return lines;
}

/**
 * Computes how much wider each inter-word gap in `line` should grow to
 * justify it - stretching it to fill `maxWidth` exactly - or `0` if this
 * line shouldn't be justified at all: `horizontalAlign` isn't `'justify'`,
 * there's no `maxWidth` to fill, this is the paragraph's last line (a
 * fully-justified last line of one or two words reads as visibly,
 * unintentionally stretched, so it stays left-aligned instead), or the line
 * has only one word (nothing to stretch).
 * @param horizontalAlign - The requested horizontal alignment.
 * @param maxWidth - The width to justify against, or `undefined` if wrapping is off.
 * @param isLastLine - Whether `line` is the paragraph's last line.
 * @param line - The line to compute a gap stretch for.
 * @returns The extra width to add per gap, in world units.
 */
function getJustifyGapStretch(
  horizontalAlign: 'left' | 'center' | 'right' | 'justify',
  maxWidth: number | undefined,
  isLastLine: boolean,
  line: ShapedLine,
): number {
  if (
    horizontalAlign !== 'justify' ||
    maxWidth === undefined ||
    isLastLine ||
    line.words.length <= 1
  ) {
    return 0;
  }

  return (maxWidth - line.width) / (line.words.length - 1);
}

/**
 * Computes the offset added to the whole shaped block to realize
 * `verticalAlign`, given that (before this offset) line `0`'s baseline sits
 * at `y = 0` and each following line's own box extends `actualLineHeight`
 * further in the negative (downward, Y-up) direction - so the unshifted
 * block spans from `y = 0` (its top) to `y = -blockHeight` (its bottom).
 * @param verticalAlign - The requested vertical alignment.
 * @param blockHeight - The shaped block's total height, in world units.
 * @returns The Y offset to add to every glyph.
 */
function getVerticalAlignOffset(
  verticalAlign: 'top' | 'middle' | 'bottom',
  blockHeight: number,
): number {
  if (verticalAlign === 'bottom') {
    return blockHeight;
  }

  if (verticalAlign === 'middle') {
    return blockHeight / 2;
  }

  return 0;
}

/**
 * Shapes a (possibly multi-line, possibly wrapped) string into glyph quads.
 * Splits on whitespace into words, greedily wraps them into lines against
 * `maxWidth` (see {@link wrapIntoLines}), then positions each line
 * according to `horizontalAlign`/`verticalAlign`/`lineHeight`.
 *
 * `justify` stretches the gaps between words to fill `maxWidth` exactly, on
 * every line except the last (a fully-justified last line of one or two
 * words reads as visibly, unintentionally stretched - most text engines
 * leave it left-aligned, and so does this one) and except lines with a
 * single word (nothing to stretch). It has no effect when `maxWidth` is
 * unset, since every line is then already exactly as wide as the block.
 *
 * Code points not present in `fontAtlasData.glyphs` are silently skipped
 * (no glyph quad, no advance) rather than throwing - a missing glyph in
 * player-supplied or localized text is a content problem, not a programming
 * error.
 * @param text - The string to shape.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param options - Shaping options.
 * @returns The shaped glyph quads and the block's bounds.
 */
export function shapeText(
  text: string,
  fontAtlasData: FontAtlasData,
  options: ShapeTextOptions,
): ShapedText {
  const {
    size,
    letterSpacing,
    lineHeight,
    horizontalAlign,
    verticalAlign,
    maxWidth,
  } = { ...defaultShapeTextOptions, ...options };

  const lines = wrapIntoLines(
    text,
    fontAtlasData,
    size,
    letterSpacing,
    maxWidth,
  );
  const blockWidth = Math.max(0, ...lines.map((line) => line.width));
  const actualLineHeight = lineHeight * fontAtlasData.metrics.lineHeight * size;
  const blockHeight = lines.length * actualLineHeight;
  const verticalOffset = getVerticalAlignOffset(verticalAlign, blockHeight);

  const glyphs: GlyphQuad[] = [];

  lines.forEach((line, lineIndex) => {
    const isLastLine = lineIndex === lines.length - 1;

    // `left` is `0` by construction; `center`/`right` distribute the
    // remaining width as a uniform offset applied to every word in the
    // line. `justify` instead stretches the gaps *between* words (via
    // `justifyGapStretch` below) and leaves this at `0`.
    let uniformOffset = 0;

    if (horizontalAlign === 'center') {
      uniformOffset = (blockWidth - line.width) / 2;
    } else if (horizontalAlign === 'right') {
      uniformOffset = blockWidth - line.width;
    }

    const justifyGapStretch = getJustifyGapStretch(
      horizontalAlign,
      maxWidth,
      isLastLine,
      line,
    );
    const lineY = -lineIndex * actualLineHeight + verticalOffset;

    line.words.forEach(({ word, startX }, wordIndex) => {
      const x = startX + uniformOffset + wordIndex * justifyGapStretch;

      for (const glyph of word.glyphs) {
        glyphs.push({
          ...glyph,
          offset: { x: glyph.offset.x + x, y: glyph.offset.y + lineY },
        });
      }
    });
  });

  return { glyphs, bounds: { width: blockWidth, height: blockHeight } };
}
