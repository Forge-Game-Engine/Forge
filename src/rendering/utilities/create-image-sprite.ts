import { Entity } from '../../ecs/index.js';
import { SpriteMaterial } from '../materials/index.js';
import type { ForgeRenderLayer } from '../render-layers/index.js';
import type { ShaderStore } from '../shaders/index.js';
import type { Sprite } from '../sprite.js';
import { createSprite } from './create-sprite.js';

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderLayer - The render layer to which the sprite will be added.
 * @param shaderStore - The shader store to use for the sprite's material.
 * @param cameraEntity - The camera entity to which the sprite will be rendered.
 * @returns The created sprite.
 */
export function createImageSprite(
  image: HTMLImageElement,
  renderLayer: ForgeRenderLayer,
  shaderStore: ShaderStore,
  cameraEntity: Entity,
): Sprite {
  const material = new SpriteMaterial(
    renderLayer.context,
    shaderStore,
    image,
    cameraEntity,
  );
  const sprite = createSprite(material, renderLayer, image.width, image.height);

  return sprite;
}
