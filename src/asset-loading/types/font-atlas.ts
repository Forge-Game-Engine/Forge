import { Vector2 } from '../../math/index.js';

/**
 * A single glyph's metrics, as produced by `msdf-atlas-gen`'s JSON output.
 *
 * `planeBounds`/`uvOffset`/`uvScale` are all omitted together for glyphs
 * with no visible shape (e.g. the space character) - such a glyph still
 * advances the cursor but contributes no glyph quad.
 */
export interface FontAtlasGlyph {
  /**
   * How far the cursor moves (in em units) after placing this glyph.
   */
  advance: number;

  /**
   * The glyph's visible quad, in em units relative to the glyph's baseline
   * origin (`left`/`right` relative to the cursor, `bottom`/`top` relative
   * to the baseline, `top` positive/upward). Omitted for glyphs with no
   * visible shape.
   */
  planeBounds?: {
    left: number;
    bottom: number;
    right: number;
    top: number;
  };

  /**
   * The top-left corner of this glyph's region in the atlas texture, 0 to 1
   * - already normalized from `msdf-atlas-gen`'s bottom-left-origin pixel
   * `atlasBounds` to match `SpriteEcsComponent.uvOffset`'s top-left, Y-down
   * convention. Omitted for glyphs with no visible shape.
   */
  uvOffset?: Vector2;

  /**
   * The width/height of this glyph's region in the atlas texture, 0 to 1.
   * Omitted for glyphs with no visible shape.
   */
  uvScale?: Vector2;
}

/**
 * Parsed metrics and glyph metadata for an MSDF font atlas, as produced by
 * [`msdf-atlas-gen`](https://github.com/Chlumsky/msdf-atlas-gen)'s JSON
 * output alongside its atlas PNG. Data-only - pairs with
 * `createMsdfTextRenderable` (`/rendering`) to build the GPU-side
 * `Renderable` used to actually draw text with this font.
 */
export interface FontAtlas {
  /**
   * The loaded atlas texture image, ready to be uploaded to the GPU by
   * `createMsdfTextRenderable`.
   */
  image: HTMLImageElement;

  /**
   * The atlas image's width, in pixels.
   */
  atlasWidth: number;

  /**
   * The atlas image's height, in pixels.
   */
  atlasHeight: number;

  /**
   * The signed distance field range, in atlas pixels, that the MSDF was
   * generated with. Feeds the fragment shader's screen-space-derivative
   * antialiasing so glyph edges stay crisp at any scale.
   */
  distanceRange: number;

  /**
   * The em size (in the same units as `metrics.lineHeight`/glyph `advance`
   * values) that every other measurement in this atlas is normalized
   * against. A consumer scale factor is `fontSize / emSize`.
   */
  emSize: number;

  /**
   * The vertical distance (in em units) between successive lines' baselines.
   */
  lineHeight: number;

  /**
   * The distance (in em units) from the baseline to the top of a typical
   * ascending glyph (e.g. "h").
   */
  ascender: number;

  /**
   * The distance (in em units) from the baseline to the bottom of a typical
   * descending glyph (e.g. "g"). Negative.
   */
  descender: number;

  /**
   * Every glyph in the atlas, keyed by Unicode code point.
   */
  glyphs: ReadonlyMap<number, FontAtlasGlyph>;

  /**
   * Kerning adjustments (in em units, added to the first code point's
   * `advance`) for specific consecutive code point pairs, keyed by
   * `` `${unicode1}:${unicode2}` ``. A pair with no entry has no kerning
   * adjustment.
   */
  kerning: ReadonlyMap<string, number>;
}

/**
 * Builds the `` `${unicode1}:${unicode2}` `` key `FontAtlas.kerning` is
 * indexed by.
 * @param unicode1 - The first code point.
 * @param unicode2 - The second code point.
 * @returns The kerning map key for this code point pair.
 */
export function getKerningKey(unicode1: number, unicode2: number): string {
  return `${unicode1}:${unicode2}`;
}
