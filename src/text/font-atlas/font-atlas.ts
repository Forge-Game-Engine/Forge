import type { Texture } from '../../rendering/texture.js';
import type { FontAtlasData } from './font-atlas-data.js';

/**
 * A fully loaded font atlas: normalized metrics plus the atlas texture, on
 * the GPU and ready to draw glyphs from. Produced by `FontAtlasCache`, which
 * owns the texture.
 */
export interface FontAtlas {
  /** The atlas's normalized metrics and glyph data. */
  readonly data: FontAtlasData;

  /**
   * The atlas image, as a linear-filtered texture. It belongs to the
   * `FontAtlasCache` that loaded it and lives as long as the cache; don't
   * dispose it while text still draws with the atlas.
   */
  readonly texture: Texture;
}
