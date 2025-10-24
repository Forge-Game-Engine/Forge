import type { Entity } from '../ecs/index.js';

type PoolCreateCallback<T> = () => T;
type PoolDisposeCallback<T> = (instance: T) => void;
type PoolHydrateCallback<T> = (instance: T) => void;

type PoolingOptions<T> = {
  createCallback: PoolCreateCallback<T>;
  disposeCallback?: PoolDisposeCallback<T>;
  hydrateCallback?: PoolHydrateCallback<T>;
};

export class ObjectPool<T extends NonNullable<unknown> = Entity> {
  private readonly _pool: Array<T>;
  private readonly _createCallback: PoolCreateCallback<T>;
  private readonly _disposeCallback?: PoolDisposeCallback<T>;
  private readonly _hydrateCallback?: PoolHydrateCallback<T>;

  constructor(options: PoolingOptions<T>, startingPool: Array<T> = []) {
    const { createCallback, disposeCallback, hydrateCallback } = options;

    this._createCallback = createCallback;
    this._disposeCallback = disposeCallback;
    this._hydrateCallback = hydrateCallback;
    this._pool = startingPool;
  }

  public getOrCreate = (): T => {
    if (this._pool.length === 0) {
      return this._create();
    }

    return this.get();
  };

  public get = (): T => {
    if (this._pool.length === 0) {
      throw new Error('Pool is empty');
    }

    const item = this._pool.pop();

    if (!item) {
      throw new Error('Pooled item is undefined');
    }

    this._hydrateCallback?.(item);

    return item;
  };

  public release = (instance: T): void => {
    this._disposeCallback?.(instance);

    this._pool.push(instance);
  };

  private readonly _create = (): T => {
    const instance = this._createCallback();

    return instance;
  };
}
