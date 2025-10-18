import { Entity } from 'forge/ecs';
import { SpriteMaterial } from 'forge/rendering/materials';
import type { ForgeRenderLayer } from 'forge/rendering/render-layers';
import type { ShaderStore } from 'forge/rendering/shaders';
import type { Sprite } from 'forge/rendering/sprite';
import { createSprite } from './create-sprite';

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
