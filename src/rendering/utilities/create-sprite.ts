import { Sprite } from '../sprite.js';
import type { Texture } from '../texture.js';

/**
 * Creates a sprite of the given size that draws `texture`.
 * @param width - The width of the sprite.
 * @param height - The height of the sprite.
 * @param texture - The texture the sprite draws.
 * @returns The created sprite.
 */
export function createSprite(
  width: number,
  height: number,
  texture: Texture,
): Sprite {
  const sprite = new Sprite({
    texture,
    width,
    height,
  });

  return sprite;
}
