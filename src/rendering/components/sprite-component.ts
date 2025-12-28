import { Component } from '../../ecs/index.js';
import { Sprite } from '../sprite.js';

/**
 * The `SpriteComponent` class implements the `Component` interface and represents
 * a component that contains a `Sprite`.
 */
export class SpriteComponent extends Component {
  /** The `Sprite` instance associated with this component. */
  public sprite: Sprite;

  /** Indicates whether the sprite is enabled or not. */
  public enabled: boolean;

  /**
   * Constructs a new instance of the `SpriteComponent` class with the given `Sprite`.
   * @param sprite - The `Sprite` instance to associate with this component.
   * @param enabled - Indicates whether the sprite is enabled or not (default: true).
   */
  constructor(sprite: Sprite, enabled: boolean = true) {
    super();

    this.sprite = sprite;
    this.enabled = enabled;
  }
}
