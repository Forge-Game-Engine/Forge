/**
 * A rectangle in a glyph's own coordinate space (see `GlyphMetrics.planeBounds`
 * and `GlyphMetrics.atlasBounds` for the two spaces this is used in). Both
 * are Y-down, like the world.
 */
export interface Bounds {
  /** The rectangle's left edge. */
  left: number;

  /** The rectangle's bottom edge (larger than `top`). */
  bottom: number;

  /** The rectangle's right edge. */
  right: number;

  /** The rectangle's top edge (smaller than `bottom`). */
  top: number;
}

/**
 * The per-glyph metrics and geometry needed to shape and render one
 * character from a `FontAtlas`.
 */
export interface GlyphMetrics {
  /** The Unicode code point this glyph represents. */
  codePoint: number;

  /** Horizontal advance to the next glyph's origin, in em units. */
  advance: number;

  /**
   * This glyph's quad, in em units relative to the glyph's origin on the
   * baseline, Y-down like the world: ink above the baseline has a negative
   * `top`. Includes the distance field's padding around the glyph's ink
   * (half of `FontAtlasData.distanceRange`, in atlas pixels), which
   * outlines and shadows draw into. `null` for glyphs with no visible ink
   * (e.g. space).
   */
  planeBounds: Bounds | null;

  /**
   * This glyph's texture rect in the atlas, normalized 0 to 1 from the
   * atlas image's top-left corner, like every texture coordinate in the
   * engine. `null` for glyphs with no visible ink (e.g. space).
   */
  atlasBounds: Bounds | null;
}

/**
 * Font metrics shared by every glyph in a `FontAtlas`, in em units. The
 * `*Line` metrics are Y positions relative to the baseline, Y-down like
 * `GlyphMetrics.planeBounds`, so a line above the baseline is negative.
 */
export interface FontAtlasMetrics {
  /** The default distance between successive lines' baselines. */
  lineHeight: number;

  /** The top of the font's tallest glyphs (negative). */
  ascentLine: number;

  /** The bottom of the font's lowest-descending glyphs (positive). */
  descentLine: number;

  /**
   * The top of the font's capital letters (e.g. "H"), excluding ascenders
   * like "b"/"d"/"h" that reach higher than a capital's flat top
   * (negative). Measured on the letter itself, without the distance field
   * padding around its quad. `TextEcsComponent.verticalAlign` reads it for
   * `'capline'` (the top of a capital on the anchor) and `'middle'` (the
   * band from the cap line to the baseline centered on the anchor).
   */
  capLine: number;
}

/** The pixel dimensions of an atlas texture. */
export interface AtlasSize {
  /** The atlas texture's width, in pixels. */
  width: number;

  /** The atlas texture's height, in pixels. */
  height: number;
}

/**
 * The current version of the `FontAtlasData`/`FontAtlasFileData` schema.
 * Bumped on any breaking change to that shape.
 */
export const CURRENT_FONT_ATLAS_FORMAT_VERSION = 3 as const;

/**
 * The runtime, Forge-owned representation of a generated MSDF font atlas's
 * metrics, decoupled from whichever offline tool generated it. Produced by
 * `toFontAtlasData` from the on-disk `FontAtlasFileData` a `FontAtlasCache`
 * loads.
 */
export interface FontAtlasData {
  /** Schema version this data was produced from. */
  formatVersion: typeof CURRENT_FONT_ATLAS_FORMAT_VERSION;

  /** The distance field type. Only `'msdf'` is supported. */
  type: 'msdf';

  /** Atlas texture pixel dimensions. */
  atlasSize: AtlasSize;

  /**
   * The distance field's encoded range, in pixels, at the atlas's authored
   * size. Required to compute the shader's `screenPxRange` at render time.
   */
  distanceRange: number;

  /** Font metrics shared by every glyph. */
  metrics: FontAtlasMetrics;

  /** Keyed by Unicode code point. */
  glyphs: Map<number, GlyphMetrics>;

  /**
   * Keyed by `getKerningPairKey(leftCodePoint, rightCodePoint)`. Absent
   * pairs kern by `0`.
   */
  kerning: Map<string, number>;
}

/**
 * Builds the lookup key `FontAtlasData.kerning` is keyed by for a pair of
 * adjacent glyphs.
 * @param leftCodePoint - The code point of the left glyph in the pair.
 * @param rightCodePoint - The code point of the right glyph in the pair.
 * @returns The kerning map key for this pair.
 */
export function getKerningPairKey(
  leftCodePoint: number,
  rightCodePoint: number,
): string {
  return `${leftCodePoint}:${rightCodePoint}`;
}
