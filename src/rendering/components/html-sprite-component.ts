import type { Component } from '../../ecs';
import { Vector2 } from '../../math';
import { Sprite } from '../sprite';

/** * The `HtmlSpriteComponent` class implements the `Component` interface and represents
 * a component that contains a `Sprite` for HTML rendering.
 */
export class HtmlSpriteComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The bleed value applied to the sprite. */
  public bleed: number;

  /** The width of the sprite, including the bleed value. */
  public width: number;

  /** The height of the sprite, including the bleed value. */
  public height: number;

  /** The pivot point of the sprite. */
  public pivot: Vector2;

  /** The name property holds the unique symbol for this component. */
  public image: HTMLImageElement;

  /** A static symbol property that uniquely identifies the `SpriteComponent`. */
  public static readonly symbol = Symbol('html-Sprite');

  /**
   * Constructs a new instance of the `SpriteComponent` class with the given `Sprite`.
   * @param sprite - The `Sprite` instance to associate with this component.
   * @param enabled - Indicates whether the sprite is enabled or not (default: true).
   */
  constructor(
    image: HTMLImageElement,
    width: number,
    height: number,
    bleed: number = 1,
    pivot: Vector2 = new Vector2(0.5, 0.5),
  ) {
    this.name = HtmlSpriteComponent.symbol;
    this.image = image;
    this.width = width + bleed * 2;
    this.height = height + bleed * 2;
    this.bleed = bleed;
    this.pivot = pivot;
  }
}
