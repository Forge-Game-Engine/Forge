import type { Vector2 } from '../../math/index.js';
import type { Color } from '../../rendering/color.js';
import type { GlyphQuad } from '../components/text-mesh-component.js';
import {
  type FontAtlasData,
  getKerningPairKey,
} from '../font-atlas/font-atlas-data.js';
import { parseRichText } from './parse-rich-text.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * How far a `<b>` glyph's ink is thickened on every side, in ems - the
 * same synthetic ("faux") bold browsers and FreeType apply when a font has
 * no bold cut: the glyph's edge is pushed outwards, and its advance grows
 * by the added width so bold letters don't run into each other.
 */
export const FAUX_BOLD_EMBOLDEN = 0.02;

/**
 * Options for {@link shapeText}. Mirrors the shape-relevant subset of
 * `TextEcsComponent`.
 */
export interface ShapeTextOptions {
  /** Font size, in world units - the rendered em height. */
  size: number;

  /**
   * Extra spacing between adjacent glyphs on a line, in ems (multiplied by
   * `size`, so tracking scales with the text). A word gap gets one letter
   * space on top of the whitespace's own advance. Never added after a
   * line's last glyph, so it doesn't skew alignment. Defaults to `0`.
   */
  letterSpacing?: number;

  /** Multiplier on the font's authored line height. Defaults to `1`. */
  lineHeight?: number;

  /**
   * Horizontal alignment of each line within `maxWidth`. Defaults to
   * `'left'`. Irrelevant, and ignored, when `maxWidth` is unset - with no
   * container to align against, every unwrapped line is already exactly as
   * wide as the block itself.
   */
  horizontalAlign?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Vertical alignment of the shaped block relative to its anchor (the
   * origin every glyph offset is relative to) - see
   * `TextDefaultedOptions.verticalAlign` for the precise semantics.
   * Defaults to `'top'`.
   */
  verticalAlign?: 'top' | 'middle' | 'bottom' | 'baseline' | 'capline';

  /**
   * Wraps at word boundaries when a line would exceed this width, in world
   * units. `undefined` (the default) never wraps.
   */
  maxWidth?: number;

  /**
   * Where the shaped block's local origin (`x = 0`, the point every glyph
   * offset is ultimately relative to) sits within the `horizontalAlign`
   * box, as a fraction of `maxWidth` from the box's left edge - `0` (the
   * default) means the origin *is* the box's left edge, `0.5` means it sits
   * at the box's horizontal center, and `1` at its right edge. Irrelevant
   * when `maxWidth` is unset, for the same reason `horizontalAlign` is (see
   * its own doc comment).
   *
   * This exists because a caller that positions the shaped block by a
   * center (or right) pivot - rather than a left edge - would otherwise get
   * `horizontalAlign`'s alignment box measured from the wrong point: e.g. a
   * `'center'`-aligned single line under a center pivot would end up
   * offset by half its own alignment box, since `x = 0` would land at the
   * box's center rather than its left edge. Defaults to `0`.
   */
  horizontalAlignPivot?: number;

  /**
   * Whether `<b>` and `<color=...>` tags in the text are parsed as markup.
   * `false` shapes the text exactly as written, tags included, for text a
   * player typed. Defaults to `true`.
   */
  richText?: boolean;
}

/** The pure-data result of shaping a string against a `FontAtlasData`. */
export interface ShapedText {
  /** One entry per visible glyph, across every line. */
  glyphs: GlyphQuad[];

  /** The shaped block's own bounds, in world units. */
  bounds: { width: number; height: number };

  /**
   * Where a caret sits at every UTF-16 boundary of the shaped (tag-free)
   * text, from `0` (before the first character) to its length (after the
   * last): the final x and the line's baseline y, offset from the block's
   * anchor like `glyphs`, after alignment, justification and the vertical
   * offset. Whitespace and characters with no glyph get stops too. The
   * boundary inside a surrogate pair gets the position of the pair's start.
   */
  caretStops: Vector2[];
}

const defaultShapeTextOptions = {
  letterSpacing: 0,
  lineHeight: 1,
  horizontalAlign: 'left' as const,
  verticalAlign: 'top' as const,
  horizontalAlignPivot: 0,
  richText: true,
};

/**
 * The style each character of the shaped (tag-free) string is drawn with,
 * indexed by UTF-16 code unit.
 */
interface CharacterStyles {
  /** The `<color>` color of each character, or `undefined` outside one. */
  colors: (Color | undefined)[];

  /** Whether each character is inside a `<b>` tag. */
  bold: boolean[];

  /**
   * The `GlyphQuad.embolden` of a bold glyph (see
   * {@link getFauxBoldEmbolden}), or `0` if the string has no bold text.
   */
  boldEmbolden: number;
}

/**
 * Parses `text`'s rich text tags into the plain string that's shaped and
 * the style of each of its characters.
 * @param text - The string to parse.
 * @param fontAtlasData - The font atlas the string is shaped against.
 * @param richText - Whether tags are parsed, or the string is taken as written.
 * @returns The plain string and its per-character styles.
 */
function resolveCharacterStyles(
  text: string,
  fontAtlasData: FontAtlasData,
  richText: boolean,
): {
  plainText: string;
  styles: CharacterStyles;
} {
  const {
    text: plainText,
    colorRuns,
    boldRuns,
  } = richText ? parseRichText(text) : { text, colorRuns: [], boldRuns: [] };
  const colors = new Array<Color | undefined>(plainText.length);
  const bold = new Array<boolean>(plainText.length).fill(false);

  for (const { start, end, color } of colorRuns) {
    colors.fill(color, start, end);
  }

  for (const { start, end } of boldRuns) {
    bold.fill(true, start, end);
  }

  const boldEmbolden =
    boldRuns.length > 0 ? getFauxBoldEmbolden(fontAtlasData) : 0;

  return { plainText, styles: { colors, bold, boldEmbolden } };
}

/**
 * Converts {@link FAUX_BOLD_EMBOLDEN} into the distance field's own units:
 * how far the MSDF shaders shift a bold glyph's edge threshold. The field
 * spans `distanceRange` atlas pixels, and the generator bakes every glyph
 * at the same size, so any glyph's atlas rect against its plane bounds
 * gives the atlas's pixels per em.
 * @param fontAtlasData - The font atlas to convert for.
 * @returns The threshold shift for a bold glyph, or `0` if the atlas has
 * no glyph with ink to measure it from.
 */
function getFauxBoldEmbolden(fontAtlasData: FontAtlasData): number {
  for (const { planeBounds, atlasBounds } of fontAtlasData.glyphs.values()) {
    const planeWidth = planeBounds ? planeBounds.right - planeBounds.left : 0;

    if (!atlasBounds || planeWidth <= 0) {
      continue;
    }

    const atlasPixelsPerEm =
      ((atlasBounds.right - atlasBounds.left) * fontAtlasData.atlasSize.width) /
      planeWidth;

    return (
      (FAUX_BOLD_EMBOLDEN * atlasPixelsPerEm) / fontAtlasData.distanceRange
    );
  }

  return 0;
}

/** A single word's shaped glyphs, positioned relative to the word's own start (x = 0). */
interface ShapedWord {
  glyphs: GlyphQuad[];
  width: number;

  /** The pen position before each of the word's code points, relative to the word's start. */
  caretOffsets: number[];
}

/**
 * Where a caret sits before one code point (or after the last one), within
 * its unaligned line: the line it's on, its x from the line's start, and
 * the index of the word whose justification shift it moves with.
 */
interface CaretPlacement {
  lineIndex: number;
  x: number;
  wordIndex: number;
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
 *
 * Each glyph takes its style from the character it was shaped from:
 * kerning and measurement only ever see the tag-free string, so a tag
 * boundary inside a word changes how a glyph is drawn, never where it
 * sits - except that a bold glyph is widened by {@link FAUX_BOLD_EMBOLDEN}
 * on both sides.
 * @param word - The word's code points, with no whitespace.
 * @param wordStart - The index of the word's first character in the shaped string, to look its style up by.
 * @param styles - The style of every character in the shaped string.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param size - Font size, in world units.
 * @param letterSpacing - Extra spacing between adjacent glyphs, in ems.
 * @returns The word's glyph quads (relative to the word's own start) and width.
 */
function shapeWord(
  word: string,
  wordStart: number,
  styles: CharacterStyles,
  fontAtlasData: FontAtlasData,
  size: number,
  letterSpacing: number,
): ShapedWord {
  const glyphs: GlyphQuad[] = [];
  const caretOffsets: number[] = [];
  let penX = 0;
  let previousCodePoint: number | null = null;
  let hasPreviousGlyph = false;
  let characterIndex = wordStart;

  for (const character of word) {
    const codePoint = character.codePointAt(0) as number;
    const glyph = fontAtlasData.glyphs.get(codePoint);
    const styleIndex = characterIndex;

    characterIndex += character.length;

    if (!glyph) {
      caretOffsets.push(penX);
      previousCodePoint = null;

      continue;
    }

    const isBold = styles.bold[styleIndex];
    const emboldenWidth = isBold ? FAUX_BOLD_EMBOLDEN * size : 0;

    // Letter spacing goes *between* glyphs, so it's added before every
    // glyph but the first rather than after every glyph: spacing after the
    // last glyph would count towards the word's width, pushing centered
    // text half a letter space left and right-aligned text a full letter
    // space short of its edge.
    if (hasPreviousGlyph) {
      penX += letterSpacing * size;
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

    caretOffsets.push(penX);

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

      // The quad doesn't grow with the bold ink: plane bounds already
      // include `distanceRange / 2` atlas pixels of padding around the ink,
      // which is where the thickened edge is drawn.
      glyphs.push({
        offset: {
          x: penX + emboldenWidth + (planeBounds.left * size + glyphWidth / 2),
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
        color: styles.colors[styleIndex],
        embolden: isBold ? styles.boldEmbolden : 0,
      });
    }

    penX += glyph.advance * size + 2 * emboldenWidth;
    previousCodePoint = codePoint;
    hasPreviousGlyph = true;
  }

  return { glyphs, width: Math.max(0, penX), caretOffsets };
}

/**
 * Measures a run of whitespace: its total advance, in world units, and the
 * pen position before each of its characters, relative to the run's start.
 * Never kerns and never applies `letterSpacing`: {@link wrapIntoLines} adds
 * one letter space per word gap itself, so a gap is the whitespace's
 * advance plus exactly one letter space however many whitespace characters
 * it has.
 * @param whitespace - A run of whitespace characters.
 * @param fontAtlasData - The font atlas metrics to look up advances in.
 * @param size - Font size, in world units.
 * @returns The run's width and caret offsets.
 */
function measureWhitespace(
  whitespace: string,
  fontAtlasData: FontAtlasData,
  size: number,
): { width: number; caretOffsets: number[] } {
  const caretOffsets: number[] = [];
  let width = 0;

  for (const character of whitespace) {
    const glyph = fontAtlasData.glyphs.get(character.codePointAt(0) as number);

    caretOffsets.push(width);
    width += glyph ? glyph.advance * size : 0;
  }

  return { width, caretOffsets };
}

/** The lines {@link wrapIntoLines} produced, plus one caret placement per code point and one after the last. */
interface WrappedText {
  lines: ShapedLine[];
  caretPlacements: CaretPlacement[];
}

/**
 * Greedily wraps `text` into lines at word boundaries: a word is appended to
 * the current line unless doing so would exceed `maxWidth` and the line
 * already has at least one word, in which case a new line starts with that
 * word instead. A single word wider than `maxWidth` on its own is never
 * split mid-word - it simply overflows its own line.
 * @param text - The full, tag-free string to wrap. A single call always
 * returns at least one (possibly empty) line.
 * @param styles - The style of every character in `text`.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param size - Font size, in world units.
 * @param letterSpacing - Extra spacing between adjacent glyphs, in ems.
 * @param maxWidth - The width to wrap at, in world units, or `undefined` to
 * never wrap (the whole string becomes one line).
 * @returns The wrapped lines, each with its placed words and content width,
 * and where a caret sits before each code point and after the last.
 */
function wrapIntoLines(
  text: string,
  styles: CharacterStyles,
  fontAtlasData: FontAtlasData,
  size: number,
  letterSpacing: number,
  maxWidth: number | undefined,
): WrappedText {
  const tokens = text.split(/(\s+)/).filter((token) => token.length > 0);
  const lines: ShapedLine[] = [];
  const caretPlacements: CaretPlacement[] = [];

  let currentWords: LineWord[] = [];
  let penX = 0;
  let lineContentWidth = 0;

  const commitLine = (): void => {
    lines.push({ words: currentWords, width: lineContentWidth });
    currentWords = [];
    penX = 0;
    lineContentWidth = 0;
  };

  const placeCarets = (
    startX: number,
    caretOffsets: readonly number[],
    wordIndex: number,
  ): void => {
    for (const caretOffset of caretOffsets) {
      caretPlacements.push({
        lineIndex: lines.length,
        x: startX + caretOffset,
        wordIndex,
      });
    }
  };

  // A caret between words (in whitespace, or in a word with no glyphs)
  // moves with the previous word when a justified line stretches its gaps.
  const previousWordIndex = (): number => Math.max(0, currentWords.length - 1);

  let tokenStart = 0;

  for (const token of tokens) {
    const wordStart = tokenStart;

    tokenStart += token.length;

    if (/^\s/.test(token)) {
      const whitespace = measureWhitespace(token, fontAtlasData, size);

      placeCarets(penX, whitespace.caretOffsets, previousWordIndex());
      penX += whitespace.width;

      continue;
    }

    const word = shapeWord(
      token,
      wordStart,
      styles,
      fontAtlasData,
      size,
      letterSpacing,
    );

    // A word whose code points are all missing from the atlas draws nothing
    // and takes up no space, so it mustn't add a letter space either.
    if (word.glyphs.length === 0 && word.width === 0) {
      placeCarets(penX, word.caretOffsets, previousWordIndex());

      continue;
    }

    // `shapeWord` only tracks between glyphs of the same word, so the
    // letter space between the previous word's last glyph and this word's
    // first one is added here. A line's first word gets none, and nothing
    // follows its last word, so the line's width never includes a trailing
    // letter space that would skew centered or right-aligned text.
    let wordGap = currentWords.length > 0 ? letterSpacing * size : 0;

    if (
      maxWidth !== undefined &&
      currentWords.length > 0 &&
      penX + wordGap + word.width > maxWidth
    ) {
      commitLine();
      wordGap = 0;
    }

    const startX = penX + wordGap;

    placeCarets(startX, word.caretOffsets, currentWords.length);
    currentWords.push({ word, startX });
    penX += wordGap + word.width;
    lineContentWidth = penX;
  }

  placeCarets(penX, [0], previousWordIndex());
  commitLine();

  return { lines, caretPlacements };
}

/**
 * Expands one caret stop per code point (plus the final one) to one per
 * UTF-16 code unit boundary: a code point outside the Basic Multilingual
 * Plane is two code units, and the boundary between them gets the pair's
 * start.
 * @param text - The shaped text.
 * @param codePointStops - One stop before each code point, then one after the last.
 * @returns One stop per UTF-16 boundary, `text.length + 1` in all.
 */
function toUtf16CaretStops(text: string, codePointStops: Vector2[]): Vector2[] {
  const stops: Vector2[] = [];
  let index = 0;

  for (const character of text) {
    const stop = codePointStops[index];

    for (let unit = 0; unit < character.length; unit++) {
      stops.push({ x: stop.x, y: stop.y });
    }

    index++;
  }

  stops.push(codePointStops[index]);

  return stops;
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
 * `verticalAlign`. Every mode anchors to the font's own metrics and the line
 * count, never to the glyphs this string happens to contain, so a label
 * stays put when its text changes and two labels aligned to the same point
 * share a baseline.
 *
 * The line-height box isn't used as the reference: a capital letter's ink
 * sits almost entirely above its baseline, so a `'top'` built from "line 0's
 * baseline sits at the box's top" would put most of the text above the
 * anchor.
 *
 * - `'top'` anchors the first line's ascender (the top of the font's
 *   tallest glyphs), and `'bottom'` the last line's descender, so no glyph
 *   crosses the anchor.
 * - `'capline'` anchors the first line's cap height (the top of a flat
 *   capital like "H"), which sits lower than the ascender of "b"/"d"/"h".
 * - `'baseline'` anchors the first line's baseline, which already sits at
 *   `y = 0` before this offset, so it's always `0`.
 * - `'middle'` centers the band from the first line's cap line to the last
 *   line's baseline - the box designers center text in (TextMesh Pro's
 *   `Capline`, CSS `text-box-edge: cap alphabetic`). Centering the
 *   ascender-to-descender box instead would sit too high for the many
 *   strings with no descenders.
 *
 * Before this offset, line `0`'s baseline sits at `y = 0` and each
 * following line's baseline is `actualLineHeight` further in the negative
 * (downward, Y-up) direction.
 * @param verticalAlign - The requested vertical alignment.
 * @param fontAtlasData - The font atlas metrics `ascender`/`descender`/`capHeight` are read from.
 * @param size - Font size, in world units.
 * @param lineCount - The number of lines in the shaped block.
 * @param actualLineHeight - The distance between two lines' baselines, in world units.
 * @returns The Y offset to add to every glyph.
 */
function getVerticalAlignOffset(
  verticalAlign: 'top' | 'middle' | 'bottom' | 'baseline' | 'capline',
  fontAtlasData: FontAtlasData,
  size: number,
  lineCount: number,
  actualLineHeight: number,
): number {
  const { ascender, descender, capHeight } = fontAtlasData.metrics;
  const lastBaseline = -(lineCount - 1) * actualLineHeight;

  if (verticalAlign === 'baseline') {
    return 0;
  }

  if (verticalAlign === 'capline') {
    return -(capHeight * size);
  }

  if (verticalAlign === 'middle') {
    return -(capHeight * size + lastBaseline) / 2;
  }

  if (verticalAlign === 'bottom') {
    return -(lastBaseline + descender * size);
  }

  return -(ascender * size);
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
 * `text` may contain rich text tags - `<b>...</b>` and
 * `<color=#rrggbb>...</color>`, see {@link parseRichText} - which are
 * stripped before shaping, so they never affect kerning or wrapping, and
 * set the style of the glyphs between them.
 *
 * Code points not present in `fontAtlasData.glyphs` are silently skipped
 * (no glyph quad, no advance) rather than throwing - a missing glyph in
 * player-supplied or localized text is a content problem, not a programming
 * error.
 * @param text - The string to shape, which may contain rich text tags.
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
    horizontalAlignPivot,
    richText,
  } = withDefaults(defaultShapeTextOptions, options);

  const { plainText, styles } = resolveCharacterStyles(
    text,
    fontAtlasData,
    richText,
  );
  const { lines, caretPlacements } = wrapIntoLines(
    plainText,
    styles,
    fontAtlasData,
    size,
    letterSpacing,
    maxWidth,
  );
  const contentWidth = Math.max(0, ...lines.map((line) => line.width));

  // `center`/`right` align each line against the requested `maxWidth`
  // container (matching ordinary text-align semantics), not against the
  // content's own tightest bounding box - using the latter would make a
  // single unwrapped line (or any line exactly as wide as the block's
  // widest line) always compute a zero offset, silently no-op'ing
  // `horizontalAlign` for the single-line case regardless of its value.
  // Falls back to `contentWidth` when `maxWidth` is unset, matching
  // `getJustifyGapStretch`'s own "no container, nothing to align against"
  // behavior.
  const alignmentWidth = maxWidth ?? contentWidth;
  const actualLineHeight = lineHeight * fontAtlasData.metrics.lineHeight * size;
  const blockHeight = lines.length * actualLineHeight;

  // Shifts the whole alignment box so its left edge - not `x = 0` - is
  // where `horizontalAlignPivot` says the box's left edge sits relative to
  // the shaped block's local origin. `0` (the default) leaves this at `0`,
  // i.e. `x = 0` *is* the box's left edge, matching every alignment mode's
  // existing behavior before this field was added.
  const boxLeftOffset = -horizontalAlignPivot * alignmentWidth;

  // Built with each line's un-offset baseline (line 0 at y = 0);
  // `verticalOffset` is applied to every glyph afterwards.
  const glyphs: GlyphQuad[] = [];
  const lineOffsets: { x: number; y: number; justifyGapStretch: number }[] = [];

  lines.forEach((line, lineIndex) => {
    const isLastLine = lineIndex === lines.length - 1;

    // `left` is `0` by construction; `center`/`right` distribute the
    // remaining width as a uniform offset applied to every word in the
    // line. `justify` instead stretches the gaps *between* words (via
    // `justifyGapStretch` below) and leaves this at `0`.
    let uniformOffset = 0;

    if (horizontalAlign === 'center') {
      uniformOffset = (alignmentWidth - line.width) / 2;
    } else if (horizontalAlign === 'right') {
      uniformOffset = alignmentWidth - line.width;
    }

    const justifyGapStretch = getJustifyGapStretch(
      horizontalAlign,
      maxWidth,
      isLastLine,
      line,
    );
    const lineY = -lineIndex * actualLineHeight;

    lineOffsets.push({
      x: boxLeftOffset + uniformOffset,
      y: lineY,
      justifyGapStretch,
    });

    line.words.forEach(({ word, startX }, wordIndex) => {
      const x =
        startX + boxLeftOffset + uniformOffset + wordIndex * justifyGapStretch;

      for (const glyph of word.glyphs) {
        glyphs.push({
          ...glyph,
          offset: { x: glyph.offset.x + x, y: glyph.offset.y + lineY },
        });
      }
    });
  });

  const verticalOffset = getVerticalAlignOffset(
    verticalAlign,
    fontAtlasData,
    size,
    lines.length,
    actualLineHeight,
  );

  for (const glyph of glyphs) {
    glyph.offset.y += verticalOffset;
  }

  const codePointStops = caretPlacements.map(
    ({ lineIndex, x, wordIndex }): Vector2 => {
      const lineOffset = lineOffsets[lineIndex];

      return {
        x: x + lineOffset.x + wordIndex * lineOffset.justifyGapStretch,
        y: lineOffset.y + verticalOffset,
      };
    },
  );

  return {
    glyphs,
    bounds: { width: contentWidth, height: blockHeight },
    caretStops: toUtf16CaretStops(plainText, codePointStops),
  };
}
