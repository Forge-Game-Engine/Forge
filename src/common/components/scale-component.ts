import type { Component } from 'forge/ecs';
import { Vector2 } from 'forge/math';

/**
 * Component to represent the scale of an entity in 2D space.
 */
export class ScaleComponent implements Component {
  public name: symbol;

  /**
   * The local scale of the entity relative to its parent (if any).
   */
  public local: Vector2;
  /**
   * The world scale of the entity in the global coordinate space.
   */
  public world: Vector2;

  public static readonly symbol = Symbol('Scale');

  /**
   * Creates an instance of ScaleComponent.
   * @param x - The scale factor along the x-axis.
   * @param y - The scale factor along the y-axis.
   */
  constructor(x: number = 1, y: number = 1) {
    this.name = ScaleComponent.symbol;

    this.local = new Vector2(x, y);
    this.world = new Vector2(x, y);
  }
}
