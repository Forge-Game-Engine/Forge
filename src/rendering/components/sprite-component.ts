import type { Component } from 'forge/ecs';
import { Sprite } from 'forge/rendering/sprite';

/**
 * The `SpriteComponent` class implements the `Component` interface and represents
 * a component that contains a `Sprite`.
 */
export class SpriteComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The `Sprite` instance associated with this component. */
  public sprite: Sprite;

  /** Indicates whether the sprite is enabled or not. */
  public enabled: boolean;

  /** A static symbol property that uniquely identifies the `SpriteComponent`. */
  public static readonly symbol = Symbol('Sprite');

  /**
   * Constructs a new instance of the `SpriteComponent` class with the given `Sprite`.
   * @param sprite - The `Sprite` instance to associate with this component.
   * @param enabled - Indicates whether the sprite is enabled or not (default: true).
   */
  constructor(sprite: Sprite, enabled: boolean = true) {
    this.name = SpriteComponent.symbol;
    this.sprite = sprite;
    this.enabled = enabled;
  }
}
