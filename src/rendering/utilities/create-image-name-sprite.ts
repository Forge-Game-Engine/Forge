import { ImageCache } from 'forge/asset-loading';
import { Entity } from 'forge/ecs';
import { ForgeRenderLayer } from 'forge/rendering/render-layers';
import { ShaderStore } from 'forge/rendering/shaders';
import type { Sprite } from 'forge/rendering/sprite';
import { createImageSprite } from './create-image-sprite';

/**
 * Creates a sprite using the provided image name and render layer.
 * @param imageName - The image name to use for the sprite.
 * @param imageCache - The image cache used to get the image.
 * @param renderLayer - The render layer to which the sprite will be added.
 * @param shaderStore - The shader store to use for the sprite's material.
 * @param cameraEntity - The camera entity to which the sprite will be rendered.
 * @returns The created sprite.
 */
export async function createImageNameSprite(
  imageName: string,
  imageCache: ImageCache,
  renderLayer: ForgeRenderLayer,
  shaderStore: ShaderStore,
  cameraEntity: Entity,
): Promise<Sprite> {
  const image = await imageCache.getOrLoad(imageName);

  return createImageSprite(image, renderLayer, shaderStore, cameraEntity);
}
