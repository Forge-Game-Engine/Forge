import { Component } from '../../ecs/index.js';
import type { ObjectPool } from '../../pooling/index.js';

/**
 * Strategy component that marks an entity to be returned to a pool when its lifetime expires.
 * This is a pure data component with no logic - it stores the pool reference.
 */
export class ReturnToPoolStrategyComponent<
  T extends NonNullable<unknown>,
> extends Component {
  public pool: ObjectPool<T>;

  /**
   * Creates an instance of the ReturnToPoolStrategyComponent.
   * @param pool - The object pool to return the entity to.
   */
  constructor(pool: ObjectPool<T>) {
    super();

    this.pool = pool;
  }
}
