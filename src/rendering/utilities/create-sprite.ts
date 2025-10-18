import { createQuadGeometry } from 'forge/rendering/geometry';
import { Material } from 'forge/rendering/materials';
import type { ForgeRenderLayer } from 'forge/rendering/render-layers';
import { Renderable } from 'forge/rendering/renderable';
import { Sprite } from 'forge/rendering/sprite';

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
