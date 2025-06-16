import type { Component } from '../../ecs';
import { Vector2 } from '../../math';

/**
 * Component to represent the scale of an entity in 2D space.
 */
export class ScaleComponent extends Vector2 implements Component {
  public static readonly symbol = Symbol('Scale');

  public name: symbol;

  /**
   * Creates an instance of ScaleComponent.
   * @param x - The scale factor along the x-axis.
   * @param y - The scale factor along the y-axis.
   */
  constructor(x: number = 1, y: number = 1) {
    super(x, y);

    this.name = ScaleComponent.symbol;
  }
}
