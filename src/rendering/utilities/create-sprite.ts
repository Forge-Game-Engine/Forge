import { createQuadGeometry } from '../geometry';
import { Material } from '../materials';
import type { ForgeRenderLayer } from '../render-layers';
import { Renderable } from '../renderable';
import { Sprite } from '../sprite';

/**
 * Creates a sprite using the provided material and render layer.
 * @param material - The material to use for the sprite.
 * @param renderLayer - The render layer to which the sprite will be added.
 * @param width - The width of the sprite.
 * @param height - The height of the sprite.
 * @returns The created sprite.
 */
export function createSprite(
  material: Material,
  renderLayer: ForgeRenderLayer,
  width: number,
  height: number,
): Sprite {
  const renderable = new Renderable(
    createQuadGeometry(renderLayer.context),
    material,
  );

  const sprite = new Sprite({
    renderable,
    renderLayer,
    width,
    height,
  });

  return sprite;
}
