import type { Component } from '../../ecs';
import { BoxCollider as Collider } from '../colliders';

/**
 * The `ColliderComponent` class represents a component that holds a `Collider` instance.
 */
export class ColliderComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The `Collider` instance associated with this component. */
  public collider: Collider;

  /** A static symbol property that uniquely identifies the `ColliderComponent`. */
  public static symbol = Symbol('Collider');

  /**
   * Constructs a new instance of the `ColliderComponent` class with the given `Collider`.
   * @param collider - The `Collider` instance to associate with this component.
   */
  constructor(collider: Collider) {
    this.name = ColliderComponent.symbol;
    this.collider = collider;
  }
}
