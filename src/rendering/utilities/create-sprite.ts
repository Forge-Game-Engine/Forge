import { createQuadGeometry } from '../geometry';
import { SpriteMaterial } from '../materials';
import type { ForgeRenderLayer } from '../render-layers';
import { Renderable } from '../renderable';
import { Sprite } from '../sprite';

export function createSprite(
  image: HTMLImageElement,
  renderLayer: ForgeRenderLayer,
) {
  const material = new SpriteMaterial(renderLayer.context, image);

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
