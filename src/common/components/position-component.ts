import type { Component } from '../../ecs';
import { Vector2 } from '../../math';

/**
 * Component to represent the position of an entity in 2D space.
 */
export class PositionComponent extends Vector2 implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('Position');

  /**
   * Creates an instance of PositionComponent.
   * @param x - The x-coordinate of the position.
   * @param y - The y-coordinate of the position.
   */
  constructor(x: number = 0, y: number = 0) {
    super(x, y);

    this.name = PositionComponent.symbol;
  }
}
