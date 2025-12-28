import { Component } from '../../ecs/index.js';
import { degreesToRadians } from '../../math/index.js';

/**
 * Component to represent the rotation of an entity in 2D space.
 */
export class RotationComponent extends Component {
  /**
   * The local rotation angle in radians.
   */
  public local: number;
  /**
   * The world rotation angle in radians.
   */
  public world: number;

  /**
   * Creates an instance of RotationComponent.
   * @param radians - The rotation angle in radians.
   */
  constructor(radians: number = 0) {
    super();

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
