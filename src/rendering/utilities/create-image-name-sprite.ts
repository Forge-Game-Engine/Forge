import { ImageCache } from '../../asset-loading';
import { Entity } from '../../ecs';
import { ForgeRenderLayer } from '../render-layers';
import { ShaderStore } from '../shaders';
import { createImageSprite } from './create-image-sprite';

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
