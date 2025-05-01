import { createQuadGeometry } from '../geometry';
import { SpriteMaterial } from '../materials';
import type { ForgeRenderLayer } from '../render-layers';
import { Renderable } from '../renderable';
import type { ShaderStore } from '../shaders';
import { Sprite } from '../sprite';

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderLayer - The render layer to which the sprite will be added.
 * @param shaderStore - The shader store to use for the sprite's material.
 * @returns The created sprite.
 */
export function createSprite(
  image: HTMLImageElement,
  renderLayer: ForgeRenderLayer,
  shaderStore: ShaderStore,
) {
  const material = new SpriteMaterial(renderLayer.context, shaderStore, image);

  const renderable = new Renderable(
    createQuadGeometry(renderLayer.context),
    material,
  );

  const sprite = new Sprite({
    renderable,
    renderLayer,
    width: image.width,
    height: image.height,
  });

  return sprite;
}
