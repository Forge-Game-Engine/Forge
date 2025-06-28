import { Entity } from '../../ecs';
import { Vector2 } from '../../math';
import { SpriteMaterial } from '../materials';
import type { ForgeRenderLayer } from '../render-layers';
import type { ShaderStore } from '../shaders';
import type { Sprite } from '../sprite';
import { createSprite } from './create-sprite';

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderLayer - The render layer to which the sprite will be added.
 * @param shaderStore - The shader store to use for the sprite's material.
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
