import type { Texture } from '../texture.js';
import type { TexturePackerAtlasData } from './parse-texture-packer-atlas.js';
import { createTextureAtlas, type TextureAtlas } from './texture-atlas.js';

/**
 * Creates a {@link TextureAtlas} from a parsed TexturePacker file and the
 * texture of the image exported with it. Each frame becomes a region with
 * its trim and pivot, and the file's `meta.scale` becomes the atlas's
 * `scale`. Use this for JSON a game already has; `TextureAtlasCache` loads
 * both files from URLs and calls it.
 * @param texture - The texture of the atlas image. It must be the size the
 * file declares (`meta.size`).
 * @param data - The file, as `parseTexturePackerAtlas` returns it.
 * @returns The atlas.
 * @throws An error if the texture's size isn't `data.size` (an image from
 * another export), or `createTextureAtlas` rejects the regions.
 */
export function createTexturePackerAtlas(
  texture: Texture,
  data: TexturePackerAtlasData,
): TextureAtlas {
  const { width, height } = data.size;

  if (texture.width !== width || texture.height !== height) {
    const image = data.imageName === null ? '' : ` "${data.imageName}"`;

    throw new Error(
      `Unable to create a texture atlas from TexturePacker data: its texture is ${texture.width}x${texture.height} texels, but the data's image${image} is ${width}x${height} (meta.size). Check that the image and the JSON come from the same export.`,
    );
  }

  return createTextureAtlas(texture, data.regions, { scale: data.scale });
}
