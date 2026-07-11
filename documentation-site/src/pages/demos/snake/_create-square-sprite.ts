import {
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';

/**
 * Creates a base sprite for a flat-colored square, by tinting a generated
 * 1x1 white pixel rather than loading an external image asset. Every
 * square in the demo (board, snake segments, pellet) clones this via
 * `{ ...squareSprite, tintColor, width, height }`, so they share one
 * `renderable` and batch into a single draw call despite each having its
 * own color and size.
 * @param renderContext - The render context used to load the pixel and build the sprite.
 * @param layer - The render layer for the sprite.
 * @returns The base square sprite, tinted white with a 1x1 world-unit size.
 */
export async function createSquareSprite(
  renderContext: RenderContext,
  layer: number,
): Promise<SpriteEcsComponent> {
  const pixel = document.createElement('canvas');
  pixel.width = 1;
  pixel.height = 1;

  const context = pixel.getContext('2d');

  if (!context) {
    throw new Error('Unable to get 2d context for the square sprite pixel.');
  }

  context.fillStyle = '#fff';
  context.fillRect(0, 0, 1, 1);

  const image = await renderContext.imageCache.getOrLoad(pixel.toDataURL());

  return createImageSprite(image, renderContext, layer);
}
