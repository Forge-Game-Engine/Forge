import { Component } from '../../ecs/index.js';

/**
 * Component to flip an entity's rendering in the x or y direction
 */
export class FlipComponent extends Component {
  public flipX: boolean;
  public flipY: boolean;

  /**
   * Creates an instance of FlipComponent.
   * @param flipX - Whether to flip the entity in the x direction.
   * @param flipY - Whether to flip the entity in the y direction.
   */
  constructor(flipX: boolean = false, flipY: boolean = false) {
    super();

    this.flipX = flipX;
    this.flipY = flipY;
  }
}
