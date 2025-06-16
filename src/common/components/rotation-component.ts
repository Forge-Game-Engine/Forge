import type { Component } from '../../ecs';
import { degreesToRadians } from '../../math';

/**
 * Component to represent the rotation of an entity in 2D space.
 */
export class RotationComponent implements Component {
  public static readonly symbol = Symbol('Rotation');

  public name: symbol;
  public radians: number;

  /**
   * Creates an instance of RotationComponent.
   * @param degrees - The rotation angle in degrees.
   * @example
   * const rotation = new RotationComponent(90);
   * console.log(rotation.radians); // 1.5708 (approximately)
   */
  constructor(degrees: number) {
    this.name = RotationComponent.symbol;
    this.radians = degreesToRadians(degrees);
  }
}
