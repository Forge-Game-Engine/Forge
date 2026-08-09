import type { FontAtlasData } from './font-atlas-data.js';

/**
 * A fully loaded font atlas: normalized metrics plus the atlas texture
 * image, ready to be uploaded to the GPU by the rendering module. Produced
 * by `FontAtlasCache`.
 */
export interface FontAtlas {
  /** The atlas's normalized metrics and glyph data. */
  readonly data: FontAtlasData;

  /** The loaded atlas texture image, not yet uploaded to the GPU. */
  readonly image: HTMLImageElement;
}
