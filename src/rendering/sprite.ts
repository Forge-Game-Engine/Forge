import { Vec2, Vector2 } from '../math/index.js';
import { Color } from './color.js';
import type { Texture } from './texture.js';

/**
 * Options for creating a `Sprite`.
 */
export type SpriteOptions = {
  /** The texture the sprite draws. */
  texture: Texture;

  /** The width of the sprite. */
  width: number;

  /** The height of the sprite. */
  height: number;

  /** The pivot point of the sprite (optional). */
  pivot?: Vector2;

  /** The tint color of the sprite (optional). */
  tintColor?: Color;
};

/**
 * Default options for creating a `Sprite`.
 */
const defaultOptions = {
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
};

/**
 * The `Sprite` class represents a sprite in the rendering system.
 */
export class Sprite {
  /** The width of the sprite, including the bleed value. */
  public width: number;

  /** The height of the sprite, including the bleed value. */
  public height: number;

  /** The pivot point of the sprite. */
  public pivot: Vector2;

  /** The tint color of the sprite. */
  public tintColor: Color;

  /** The texture the sprite draws. */
  public texture: Texture;

  /**
   * Constructs a new instance of the `Sprite` class.
   * @param options - The options for creating the sprite.
   */
  constructor(options: SpriteOptions) {
    const { texture, pivot, width, height, tintColor } = {
      ...defaultOptions,
      ...options,
    };

    this.pivot = Vec2.clone(pivot);

    this.tintColor = tintColor;
    this.width = width;
    this.height = height;

    this.texture = texture;
  }
}
