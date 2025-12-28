import { Component } from '../../ecs/index.js';

/**
 * Component to track an entities speed.
 */
export class SpeedComponent extends Component {
  public speed: number;

  /**
   * Creates an instance of SpeedComponent.
   * @param speed - the entity's speed
   */
  constructor(speed: number) {
    super();

    this.speed = speed;
  }
}
