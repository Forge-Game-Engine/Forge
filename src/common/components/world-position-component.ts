import type { Component } from '../../ecs';
import { Vector2 } from '../../math';

/**
 * Component to represent the world position of an entity in 2D space.
 * This is the computed position after applying parent transforms.
 */
export class WorldPositionComponent extends Vector2 implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('WorldPosition');

  /**
   * Creates an instance of WorldPositionComponent.
   * @param x - The x-coordinate of the world position.
   * @param y - The y-coordinate of the world position.
   */
  constructor(x: number = 0, y: number = 0) {
    super(x, y);

    this.name = WorldPositionComponent.symbol;
  }
}
