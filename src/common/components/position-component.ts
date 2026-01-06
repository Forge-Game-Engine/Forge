import { Component } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * Component to represent the position of an entity in 2D space.
 */
export class PositionComponent extends Component {
  /**
   * The local position of the entity relative to its parent (if any).
   */
  public local: Vector2;

  /**
   * The world position of the entity in the global coordinate space.
   */
  public world: Vector2;

  /**
   * Creates an instance of PositionComponent.
   * @param x - The x-coordinate of the position.
   * @param y - The y-coordinate of the position.
   */
  constructor(x: number = 0, y: number = 0) {
    super();

    this.local = new Vector2(x, y);
    this.world = new Vector2(x, y);
  }
}

export interface PositionEcsComponent {
  local: Vector2;
  world: Vector2;
}

export const positionId = createComponentId<PositionEcsComponent>('position');
