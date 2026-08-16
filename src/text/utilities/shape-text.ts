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
   * Vertical alignment of the shaped block's visible ink relative to its
   * anchor (the origin every glyph offset is relative to) - see
   * `TextDefaultedOptions.verticalAlign` for the precise semantics.
   * Defaults to `'top'`.
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

/**
 * The `effectClearance` assigned to a glyph with no relevant same-word
 * neighbor on one (or both) sides - e.g. a word's first or last glyph, or a
 * word with only one glyph. Deliberately a large-but-finite world-unit
 * value rather than `Infinity`: it needs to survive being multiplied by a
 * screen-pixel-per-world-unit factor in the (mediump-precision) fragment
 * shader without overflowing GLSL ES's minimum guaranteed mediump range
 * (~2^14), while still comfortably dwarfing any real atlas-budget-derived
 * screen-pixel-range effect size at any sane camera zoom - so it behaves as
 * "unconstrained by a neighbor" without any special-casing on the shader
 * side (see `msdf.frag.glsl`, which just takes the `min` of this and the
 * atlas's own safe budget).
 */
const UNCONSTRAINED_EFFECT_CLEARANCE = 100;

/**
 * Computes and assigns `GlyphQuad.effectClearance` for every glyph in a
 * word, in place: the full gap (in world units) to the tighter of each
 * glyph's left/right same-word neighbor, so that an outline/shadow effect
 * can safely reach right up to - but never past - a same-word neighbor's own
 * ink. This is *not* split in half between the two glyphs sharing a gap:
 * each one independently computes the same full gap back to the other, so
 * an effect on both sides of a tight pair can meet (or overlap) in the
 * middle without either one ever painting over the other's actual glyph
 * shape - the only thing that produces a visible defect (see PR #598 /
 * issue #584's "later glyph paints over earlier one's ink"). Two glyphs'
 * outline/shadow *layers* overlapping in the gap between them is harmless -
 * they're typically the same color, and even when they're not, blending is
 * order-independent everywhere except right at the boundary of an actual
 * glyph shape, which this clamp keeps clear.
 *
 * The gap is measured between each glyph's *ink* edges (`glyph.size` minus
 * `inkPadding` on each side), not its full padded quad edges. A real MSDF
 * atlas's baked-in per-glyph padding (`distanceRange / 2` atlas pixels,
 * baked into `planeBounds`/`atlasBounds` by the generator) is routinely
 * *larger* than the actual visual gap between two ordinarily-spaced
 * letters - measuring from the padded quad edges instead of the ink edges
 * made this clamp to 0 for nearly every adjacent glyph pair in ordinary
 * text (verified empirically against a real generated atlas: "AB" showed
 * no outline at all at a small, otherwise-safe `outlineWidth`), not just
 * the deliberately tight kerned pairs ("il"/"ff") this is meant to catch.
 *
 * Deliberately scoped to *same-word* adjacency only - the actual reported
 * failure mode (PR #598 / issue #584) is tight intra-word kerned pairs like
 * "il"/"ff", which is exactly what word-local, kerning-aware advance
 * positions already capture. A word boundary is always separated by at
 * least one whitespace glyph's advance, which for any real font is already
 * far wider than a typical outline/shadow, so leaving cross-word and
 * cross-line proximity unconstrained (deferring entirely to the atlas's own
 * safe budget there) is a deliberate, documented scope decision, not an
 * oversight - the same word-scoping `shapeWord`'s own kerning already uses.
 * @param glyphs - A word's shaped glyphs, in visual (left-to-right) order.
 * @param inkPadding - Each glyph's own quad-edge-to-ink-edge padding, in
 * world units, parallel to `glyphs` (see `shapeWord`'s derivation).
 */
function assignEffectClearances(
  glyphs: GlyphQuad[],
  inkPadding: readonly number[],
): void {
  const inkLeftEdge = (index: number): number =>
    glyphs[index].offset.x - glyphs[index].size.x / 2 + inkPadding[index];
  const inkRightEdge = (index: number): number =>
    glyphs[index].offset.x + glyphs[index].size.x / 2 - inkPadding[index];

  for (let index = 0; index < glyphs.length; index++) {
    const gapToLeftNeighbor =
      index > 0
        ? inkLeftEdge(index) - inkRightEdge(index - 1)
        : UNCONSTRAINED_EFFECT_CLEARANCE;

    const gapToRightNeighbor =
      index < glyphs.length - 1
        ? inkLeftEdge(index + 1) - inkRightEdge(index)
        : UNCONSTRAINED_EFFECT_CLEARANCE;

    glyphs[index].effectClearance = Math.max(
      0,
      Math.min(gapToLeftNeighbor, gapToRightNeighbor),
    );
  }
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
  // Each glyph's own quad-edge-to-ink-edge padding, in world units, parallel
  // to `glyphs` - see `assignEffectClearances`'s doc comment for why this
  // (rather than the padded quad edges themselves) is what neighbor-gap
  // clamping needs to measure from.
  const inkPadding: number[] = [];
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

      // How many world units this glyph's own quad is padded beyond its
      // true ink, horizontally - derived from distanceRange (in atlas
      // pixels) via this glyph's own world-units-per-atlas-pixel ratio,
      // rather than assumed constant across the atlas, since it's cheap to
      // compute per-glyph and robust to any minor per-glyph packing
      // variance. Clamped to at most half the glyph's own width so a very
      // narrow glyph (e.g. "." or "i") can never produce inverted
      // (left > right) ink edges.
      const atlasWidthPx =
        (atlasBounds.right - atlasBounds.left) * fontAtlasData.atlasSize.width;
      const inkPaddingX =
        atlasWidthPx > 0
          ? Math.min(
              (fontAtlasData.distanceRange / 2) * (glyphWidth / atlasWidthPx),
              glyphWidth / 2,
            )
          : 0;

      inkPadding.push(inkPaddingX);

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
        // Assigned below, once every glyph in the word has been placed and
        // each one's actual neighbor gap is known.
        effectClearance: 0,
      });
    }

    penX += (glyph.advance + letterSpacing) * size;
    previousCodePoint = codePoint;
  }

  assignEffectClearances(glyphs, inkPadding);

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
 * `verticalAlign`, anchored to the block's actual visible ink - line `0`'s
 * ascender for `'top'`, the last line's descender for `'bottom'` - rather
 * than the line-height box `actualLineHeight` implies. Anchoring to the
 * line-height box instead of the ink is the more obvious thing to try, but
 * it's wrong: a capital letter's ink sits almost entirely *above* its
 * baseline, so a `'top'` alignment built from "line 0's unshifted baseline
 * sits at the box's top" would place most of the text *above* the anchor,
 * the opposite of what `'top'` is supposed to mean, and `'middle'` would
 * never actually cross through the visible glyphs.
 *
 * Before this offset, line `0`'s baseline sits at `y = 0` and each
 * following line's baseline is `actualLineHeight` further in the negative
 * (downward, Y-up) direction.
 * @param verticalAlign - The requested vertical alignment.
 * @param fontAtlasData - The font atlas metrics `ascender`/`descender` are read from.
 * @param size - Font size, in world units.
 * @param lineCount - The number of lines in the shaped block.
 * @param actualLineHeight - The distance between two lines' baselines, in world units.
 * @returns The Y offset to add to every glyph.
 */
function getVerticalAlignOffset(
  verticalAlign: 'top' | 'middle' | 'bottom',
  fontAtlasData: FontAtlasData,
  size: number,
  lineCount: number,
  actualLineHeight: number,
): number {
  const inkTop = fontAtlasData.metrics.ascender * size;
  const inkBottom =
    -(lineCount - 1) * actualLineHeight +
    fontAtlasData.metrics.descender * size;

  if (verticalAlign === 'bottom') {
    return -inkBottom;
  }

  if (verticalAlign === 'middle') {
    return -(inkTop + inkBottom) / 2;
  }

  return -inkTop;
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
  const verticalOffset = getVerticalAlignOffset(
    verticalAlign,
    fontAtlasData,
    size,
    lines.length,
    actualLineHeight,
  );

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
