import { Vector2 } from '../../../math/index.js';

/**
 * Metrics for a single glyph in a BMFont atlas.
 *
 * Coordinates follow the BMFont convention: `uvRect` is the normalised (0–1)
 * region of the atlas texture, `size` is the glyph's pixel dimensions in the
 * atlas, `bearing` is the pixel offset from the cursor origin to the glyph's
 * top-left corner, and `advance` is the horizontal cursor advance after the
 * glyph.
 */
export interface GlyphMetrics {
  /** Unicode codepoint. */
  codepoint: number;

  /**
   * Normalised (0–1) UV rectangle within the atlas texture.
   * `x`/`y` is the top-left corner; `w`/`h` is the extent.
   */
  uvRect: { x: number; y: number; w: number; h: number };

  /** Glyph dimensions in atlas pixels. */
  size: { w: number; h: number };

  /**
   * Pixel offset from the cursor origin to the glyph's top-left corner.
   * `x` = `xoffset`, `y` = `yoffset` in BMFont terminology.
   */
  bearing: { x: number; y: number };

  /** Horizontal advance (cursor increment) in atlas pixels. */
  advance: number;
}

/** SDF atlas variant. `'msdf'` uses three channels; `'sdf'` uses one. */
export type SdfType = 'sdf' | 'msdf';

/**
 * A loaded, GPU-ready font asset produced by {@link loadFontAsset}.
 *
 * Matches the BMFont / msdf-bmfont-xml JSON layout so the generator tool
 * (F3.2) and third-party tools can interoperate.
 */
export interface FontAsset {
  /** Uploaded atlas texture. */
  texture: WebGLTexture;

  /** Atlas dimensions in pixels. */
  atlasSize: Vector2;

  /** Vertical distance between lines in atlas pixels. */
  lineHeight: number;

  /**
   * Distance from the top of a line box to the baseline in atlas pixels.
   * Corresponds to `common.base` in BMFont JSON.
   */
  ascent: number;

  /**
   * Distance from the baseline to the bottom of a line box in atlas pixels.
   * Derived as `lineHeight - ascent`.
   */
  descent: number;

  /**
   * BMFont `common.base` value (baseline from the top of the line box, in
   * atlas pixels). Kept separately for tooling that reads BMFont directly.
   */
  base: number;

  /** SDF spread in atlas pixels. */
  distanceRange: number;

  /** Whether the atlas stores single-channel SDF or multi-channel MSDF. */
  sdfType: SdfType;

  /** Per-codepoint glyph metrics, keyed by Unicode codepoint. */
  glyphs: Map<number, GlyphMetrics>;

  /**
   * Optional kerning pairs.  `kerning.get(firstCodepoint)?.get(secondCodepoint)`
   * gives the kerning adjustment in atlas pixels to add to `advance`.
   */
  kerning?: Map<number, Map<number, number>>;
}

/**
 * Raw BMFont JSON shape produced by msdf-bmfont-xml and similar tools.
 * Used internally by {@link loadFontAsset}.
 */
export interface BmFontJson {
  info: { size: number };
  common: {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
  };
  distanceField?: { fieldType: string; distanceRange: number };
  chars: Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
  }>;
  kernings?: Array<{ first: number; second: number; amount: number }>;
}
