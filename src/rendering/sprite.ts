import { Vector2 } from 'forge/math';
import type { ForgeRenderLayer } from './render-layers';
import { Renderable } from './renderable';

/**
 * Options for creating a `Sprite`.
 */
export type SpriteOptions = {
  /** The render layer to which the sprite belongs. */
  renderLayer: ForgeRenderLayer;

  /** The renderable to use for the sprite. */
  renderable: Renderable;

  /** The width of the sprite. */
  width: number;

  /** The height of the sprite. */
  height: number;

  /** The bleed value to apply to the sprite (optional). */
  bleed?: number;

  /** The pivot point of the sprite (optional). */
  pivot?: Vector2;
};

/**
 * Default options for creating a `Sprite`.
 */
const defaultOptions = {
  bleed: 1,
  pivot: new Vector2(0.5, 0.5),
};

/**
 * The `Sprite` class represents a sprite in the rendering system.
 */
export class Sprite {
  /** The render layer to which the sprite belongs. */
  public renderLayer: ForgeRenderLayer;

  /** The bleed value applied to the sprite. */
  public bleed: number;

  /** The width of the sprite, including the bleed value. */
  public width: number;

  /** The height of the sprite, including the bleed value. */
  public height: number;

  /** The pivot point of the sprite. */
  public pivot: Vector2;

  /** The sprite material used for rendering. */
  public readonly renderable: Renderable;

  /**
   * Constructs a new instance of the `Sprite` class.
   * @param options - The options for creating the sprite.
   */
  constructor(options: SpriteOptions) {
    const { renderable, bleed, pivot, renderLayer, width, height } = {
      ...defaultOptions,
      ...options,
    };

    this.renderLayer = renderLayer;
    this.bleed = bleed;
    this.pivot = pivot.clone();

    this.width = width + bleed;
    this.height = height + bleed;

    this.renderable = renderable;
  }
}
