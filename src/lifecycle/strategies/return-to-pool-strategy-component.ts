import type { Component } from '../../ecs';
import type { ObjectPool } from '../../pooling';

/**
 * Strategy component that marks an entity to be returned to a pool when its lifetime expires.
 * This is a pure data component with no logic - it stores the pool reference.
 */
export class ReturnToPoolStrategyComponent<T> implements Component {
  public name: symbol;
  public pool: ObjectPool<T>;
  public static readonly symbol = Symbol('ReturnToPoolStrategy');

  /**
   * Creates an instance of the ReturnToPoolStrategyComponent.
   * @param pool - The object pool to return the entity to.
   */
  constructor(pool: ObjectPool<T>) {
    this.name = ReturnToPoolStrategyComponent.symbol;
    this.pool = pool;
  }
}
