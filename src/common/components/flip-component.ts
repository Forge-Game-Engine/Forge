import type { Component } from '../../ecs';

/**
 * Component to flip an entity's rendering in the x or y direction
 */
export class FlipComponent implements Component {
  public name: symbol;
  public flipX: boolean;
  public flipY: boolean;

  public static readonly symbol = Symbol('Flip');

  constructor(flipX: boolean = false, flipY: boolean = false) {
    this.name = FlipComponent.symbol;
    this.flipX = flipX;
    this.flipY = flipY;
  }
}
