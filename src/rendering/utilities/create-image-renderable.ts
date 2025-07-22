import { ImageCache } from '../../asset-loading';
import { Entity } from '../../ecs';
import { createQuadGeometry } from '../geometry';
import { SpriteMaterial } from '../materials';
import { ForgeRenderLayer } from '../render-layers';
import { Renderable } from '../renderable';
import { ShaderStore } from '../shaders';

export async function createImageRenderable(
  imageName: string,
  imageCache: ImageCache,
  renderLayer: ForgeRenderLayer,
  shaderStore: ShaderStore,
  cameraEntity: Entity,
) {
  const image = await imageCache.getOrLoad(imageName);

  const material = new SpriteMaterial(
    renderLayer.context,
    shaderStore,
    image,
    cameraEntity,
  );

  return new Renderable(createQuadGeometry(renderLayer.context), material);
}
