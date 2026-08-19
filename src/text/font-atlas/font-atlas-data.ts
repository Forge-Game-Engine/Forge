/**
 * A rectangle in a glyph's own coordinate space (see `GlyphMetrics.planeBounds`
 * and `GlyphMetrics.atlasBounds` for the two spaces this is used in).
 */
export interface Bounds {
  /** The rectangle's left edge. */
  left: number;

  /** The rectangle's bottom edge (smaller than `top`). */
  bottom: number;

  /** The rectangle's right edge. */
  right: number;

  /** The rectangle's top edge (larger than `bottom`). */
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
   * This glyph's quad, in em units relative to the text baseline origin,
   * Y-up. `null` for glyphs with no visible ink (e.g. space).
   */
  planeBounds: Bounds | null;

  /**
   * This glyph's texture rect in the atlas, normalized 0 to 1 with `top`
   * closer to the top of the atlas image than `bottom`. `null` for glyphs
   * with no visible ink (e.g. space).
   */
  atlasBounds: Bounds | null;
}

/** Font metrics shared by every glyph in a `FontAtlas`, in em units. */
export interface FontAtlasMetrics {
  /** The default distance between successive lines' baselines. */
  lineHeight: number;

  /** The distance from the baseline to the top of the font's tallest glyphs. */
  ascender: number;

  /** The distance from the baseline to the bottom of the font's lowest-descending glyphs (negative). */
  descender: number;

  /**
   * The distance from the baseline to the top of the font's capital letters
   * (e.g. "H"), excluding ascenders like "b"/"d"/"h" that reach higher than
   * a capital's flat top. Used by `TextEcsComponent.verticalAlign:
   * 'capline'` to anchor a title/label to its capital letters specifically,
   * ignoring both true ascenders and any descenders.
   */
  capHeight: number;
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
export const CURRENT_FONT_ATLAS_FORMAT_VERSION = 2 as const;

/**
 * The runtime, Forge-owned representation of a generated MSDF font atlas's
 * metrics, decoupled from whichever offline tool generated it. Produced by
 * `toFontAtlasData` from the on-disk `FontAtlasFileData` a `FontAtlasCache`
 * loads.
 */
export interface FontAtlasData {
  /** Schema version this data was produced from. */
  formatVersion: typeof CURRENT_FONT_ATLAS_FORMAT_VERSION;

  /** `'msdf'` for v1; reserved for `'mtsdf'` later. */
  type: 'msdf';

  /** Atlas texture path, relative to this atlas's JSON file. */
  atlasImage: string;

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
