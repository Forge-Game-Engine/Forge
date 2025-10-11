import type { Component } from '../../ecs';

/**
 * Component to represent the world rotation of an entity in 2D space.
 * This is the computed rotation after applying parent transforms.
 */
export class WorldRotationComponent implements Component {
  public name: symbol;
  public radians: number;

  public static readonly symbol = Symbol('WorldRotation');

  /**
   * Creates an instance of WorldRotationComponent.
   * @param radians - The rotation angle in radians.
   */
  constructor(radians: number = 0) {
    this.name = WorldRotationComponent.symbol;
    this.radians = radians;
  }
}
