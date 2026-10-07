import type { TextureOptions } from './texture.js';

/**
 * How a texture is sampled when its options leave a field out. Shared by
 * `Texture` and `TextureCache`, which keys textures by their resolved
 * options.
 */
export const defaultTextureOptions: TextureOptions = {
  filter: 'linear',
  wrap: 'clamp',
};
