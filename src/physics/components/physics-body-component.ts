import type { Body } from 'matter-js';
import type { Component } from '../../ecs';

/**
 * Component to manage physics bodies in the game.
 * This component is used to represent a physics body in the game.
 */
export class PhysicsBodyComponent implements Component {
  public name: symbol;

  /**
   * The physics body associated with this component.
   * This is the Matter.js body that represents the physical properties of the entity.
   */
  public physicsBody: Body;

  public static readonly symbol = Symbol('PhysicsBody');

  /**
   * Creates an instance of PhysicsBodyComponent.
   * This component is used to represent a physics body in the game.
   */
  constructor(physicsBody: Body) {
    this.name = PhysicsBodyComponent.symbol;
    this.physicsBody = physicsBody;
  }
}
