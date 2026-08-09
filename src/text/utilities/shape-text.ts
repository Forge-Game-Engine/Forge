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
}

/** The pure-data result of shaping a string against a `FontAtlasData`. */
export interface ShapedText {
  /** One entry per visible glyph. */
  glyphs: GlyphQuad[];

  /** The shaped line's own bounds, in world units. */
  bounds: { width: number; height: number };
}

const defaultShapeTextOptions = { letterSpacing: 0 };

/**
 * Shapes a single line of text into glyph quads: an advance + kerning walk
 * over `text`'s code points, positioning each visible glyph's quad centered
 * on its baseline-relative plane bounds (matching `NineSliceRegion.offset`'s
 * "quad center" convention, since glyph quads are drawn through the same
 * pivot-0.5 sprite machinery).
 *
 * Code points not present in `fontAtlasData.glyphs` are silently skipped
 * (no glyph quad, no advance) rather than throwing - a missing glyph in
 * player-supplied or localized text is a content problem, not a programming
 * error.
 * @param text - The string to shape. Multi-line/wrapping input is not
 * supported yet (Phase 3) - every code point is laid out on a single line.
 * @param fontAtlasData - The font atlas metrics to shape against.
 * @param options - Shaping options.
 * @returns The shaped glyph quads and the line's bounds.
 */
export function shapeText(
  text: string,
  fontAtlasData: FontAtlasData,
  options: ShapeTextOptions,
): ShapedText {
  const { size, letterSpacing } = { ...defaultShapeTextOptions, ...options };

  const glyphs: GlyphQuad[] = [];
  let penX = 0;
  let previousCodePoint: number | null = null;

  for (const character of text) {
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

      glyphs.push({
        offset: {
          x: penX + (planeBounds.left * size + glyphWidth / 2),
          y: planeBounds.bottom * size + glyphHeight / 2,
        },
        size: { x: glyphWidth, y: glyphHeight },
        // `atlasBounds` is Y-up (`top` > `bottom`, matching `planeBounds`),
        // but UV sampling in this engine is Y-down (v=0 is the top of the
        // texture - see `computeNineSliceRegions`'s `uvOffset`, documented
        // as the region's top-left corner). `1 - atlasBounds.top` converts
        // the glyph's top edge to its Y-down v; the scale's magnitude is
        // unaffected by the flip.
        uvOffset: { x: atlasBounds.left, y: 1 - atlasBounds.top },
        uvScale: {
          x: atlasBounds.right - atlasBounds.left,
          y: atlasBounds.top - atlasBounds.bottom,
        },
      });
    }

    penX += (glyph.advance + letterSpacing) * size;
    previousCodePoint = codePoint;
  }

  return {
    glyphs,
    bounds: {
      width: Math.max(0, penX),
      height: fontAtlasData.metrics.lineHeight * size,
    },
  };
}
