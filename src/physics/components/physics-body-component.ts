import type { Body } from 'matter-js';
import { Component } from '../../ecs/index.js';

/**
 * Component to manage physics bodies in the game.
 * This component is used to represent a physics body in the game.
 */
export class PhysicsBodyComponent extends Component {
  /**
   * The physics body associated with this component.
   * This is the Matter.js body that represents the physical properties of the entity.
   */
  public physicsBody: Body;

  /**
   * Creates an instance of PhysicsBodyComponent.
   * This component is used to represent a physics body in the game.
   */
  constructor(physicsBody: Body) {
    super();

    this.physicsBody = physicsBody;
  }
}
