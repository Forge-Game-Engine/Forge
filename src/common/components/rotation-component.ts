import type { Component } from 'forge/ecs';
import { degreesToRadians } from 'forge/math';

/**
 * Component to represent the rotation of an entity in 2D space.
 */
export class RotationComponent implements Component {
  public name: symbol;

  /**
   * The local rotation angle in radians.
   */
  public local: number;
  /**
   * The world rotation angle in radians.
   */
  public world: number;

  public static readonly symbol = Symbol('Rotation');

  /**
   * Creates an instance of RotationComponent.
   * @param radians - The rotation angle in radians.
   */
  constructor(radians: number = 0) {
    this.name = RotationComponent.symbol;
    this.local = radians;
    this.world = radians;
  }

  /**
   * Creates a RotationComponent from an angle in degrees.
   * @param degrees - The rotation angle in degrees.
   * @returns A new instance of RotationComponent.
   */
  public static fromDegrees(degrees: number): RotationComponent {
    return new RotationComponent(degreesToRadians(degrees));
  }
}
