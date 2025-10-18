import type { Component } from 'forge/ecs';

/**
 * Component to flip an entity's rendering in the x or y direction
 */
export class FlipComponent implements Component {
  public name: symbol;
  public flipX: boolean;
  public flipY: boolean;

  public static readonly symbol = Symbol('Flip');

  /**
   * Creates an instance of FlipComponent.
   * @param flipX - Whether to flip the entity in the x direction.
   * @param flipY - Whether to flip the entity in the y direction.
   */
  constructor(flipX: boolean = false, flipY: boolean = false) {
    this.name = FlipComponent.symbol;
    this.flipX = flipX;
    this.flipY = flipY;
  }
}
