import {
  type AtlasSize,
  CURRENT_FONT_ATLAS_FORMAT_VERSION,
  type FontAtlasData,
  type FontAtlasMetrics,
  type GlyphMetrics,
} from './font-atlas-data.js';

/**
 * The on-disk, JSON-serializable shape of a committed font atlas asset
 * (`<name>.json`, sitting alongside `<name>.png`). This is the same data as
 * `FontAtlasData`, except `glyphs`/`kerning` use JSON-safe arrays/records
 * instead of `Map`s. `toFontAtlasData` converts one into the other.
 */
export interface FontAtlasFileData {
  /** Schema version this file was written as. */
  formatVersion: typeof CURRENT_FONT_ATLAS_FORMAT_VERSION;

  /** `'msdf'` for v1; reserved for `'mtsdf'` later. */
  type: 'msdf';

  /** Atlas texture path, relative to this JSON file. */
  atlasImage: string;

  /** Atlas texture pixel dimensions. */
  atlasSize: AtlasSize;

  /** The distance field's encoded range, in pixels, at the atlas's authored size. */
  distanceRange: number;

  /** Font metrics shared by every glyph. */
  metrics: FontAtlasMetrics;

  /** One entry per glyph in the atlas. */
  glyphs: GlyphMetrics[];

  /** Keyed by `getKerningPairKey(leftCodePoint, rightCodePoint)`. */
  kerning: Record<string, number>;
}

/**
 * Converts the on-disk `FontAtlasFileData` shape into the runtime,
 * `Map`-based `FontAtlasData` shape.
 * @param fileData - The parsed and validated on-disk atlas data.
 * @returns The runtime font atlas data.
 */
export function toFontAtlasData(fileData: FontAtlasFileData): FontAtlasData {
  return {
    formatVersion: fileData.formatVersion,
    type: fileData.type,
    atlasImage: fileData.atlasImage,
    atlasSize: fileData.atlasSize,
    distanceRange: fileData.distanceRange,
    metrics: fileData.metrics,
    glyphs: new Map(fileData.glyphs.map((glyph) => [glyph.codePoint, glyph])),
    kerning: new Map(Object.entries(fileData.kerning)),
  };
}
