import type { FontAtlas } from '../text/font-atlas/font-atlas.js';
import type { InstanceComponents, Renderable } from './renderable.js';
import type { Texture } from './texture.js';

/**
 * One quad the render system draws: a sprite, a nine-slice region or a
 * glyph. Consecutive commands (in draw order) with the same `renderable`,
 * `texture` and `emissiveTexture` draw as one instanced batch.
 */
export interface RenderCommand {
  layer: number;
  depth: number;
  renderable: Renderable;
  /** The texture the quad samples: a sprite's texture or a font atlas's. */
  texture: Texture;
  /** A sprite's emissive map, or `null` for none. */
  emissiveTexture: Texture | null;
  /** The font atlas a glyph is drawn from; `undefined` for sprites. */
  fontAtlas?: FontAtlas;
  components: InstanceComponents;
}
