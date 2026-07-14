import { Renderable } from '../renderable.js';
import { Sprite } from '../sprite.js';

/**
 * Creates a sprite using the provided material and render context.
 * @param width - The width of the sprite.
 * @param height - The height of the sprite.
 * @param renderable - The renderable to use for the sprite.
 * @returns The created sprite.
 */
export function createSprite(
  width: number,
  height: number,
  renderable: Renderable,
): Sprite {
  const sprite = new Sprite({
    renderable,
    width,
    height,
  });

  return sprite;
}
