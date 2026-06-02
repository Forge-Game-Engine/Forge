import { Vector2 } from '../math/index.js';
import { Color } from './color.js';
import { Renderable } from './renderable.js';

/**
 * Options for creating a `Sprite`.
 */
export type SpriteOptions = {
  /** The renderable to use for the sprite. */
  renderable: Renderable;

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
  pivot: new Vector2(0.5, 0.5),
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

  /** The renderable associated with the sprite. */
  public readonly renderable: Renderable;

  /**
   * Constructs a new instance of the `Sprite` class.
   * @param options - The options for creating the sprite.
   */
  constructor(options: SpriteOptions) {
    const { renderable, pivot, width, height, tintColor } = {
      ...defaultOptions,
      ...options,
    };

    this.pivot = pivot.clone();

    this.tintColor = tintColor;
    this.width = width;
    this.height = height;

    this.renderable = renderable;
  }
}
