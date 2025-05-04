import type { Component } from '../../ecs';
import { BoxCollider as Collider } from '../colliders';

/**
 * The `BoxColliderComponent` class implements the `Component` interface and represents
 * a component that contains a `BoxCollider`.
 */
export class ColliderComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The `BoxCollider` instance associated with this component. */
  public boxCollider: Collider;

  /** A static symbol property that uniquely identifies the `BoxColliderComponent`. */
  public static symbol = Symbol('Collider');

  /**
   * Constructs a new instance of the `BoxColliderComponent` class with the given `BoxCollider`.
   * @param boxCollider - The `BoxCollider` instance to associate with this component.
   */
  constructor(boxCollider: Collider) {
    this.name = ColliderComponent.symbol;
    this.boxCollider = boxCollider;
  }
}
