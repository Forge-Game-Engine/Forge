import { ImageCache } from '../../asset-loading';
import { Entity } from '../../ecs';
import { ForgeRenderLayer } from '../render-layers';
import { ShaderStore } from '../shaders';
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
) {
  const image = await imageCache.getOrLoad(imageName);

  return createImageSprite(image, renderLayer, shaderStore, cameraEntity);
}
