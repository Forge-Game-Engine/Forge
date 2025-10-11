import type { Component } from '../../ecs';
import { Vector2 } from '../../math';

/**
 * Component to represent the world scale of an entity in 2D space.
 * This is the computed scale after applying parent transforms.
 */
export class WorldScaleComponent extends Vector2 implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('WorldScale');

  /**
   * Creates an instance of WorldScaleComponent.
   * @param x - The scale factor along the x-axis.
   * @param y - The scale factor along the y-axis.
   */
  constructor(x: number = 1, y: number = 1) {
    super(x, y);

    this.name = WorldScaleComponent.symbol;
  }
}
