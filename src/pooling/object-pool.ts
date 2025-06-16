import type { Entity } from '../ecs';

type PoolCreateCallback<T> = () => T;
type PoolDisposeCallback<T> = (instance: T) => void;

export class ObjectPool<T extends NonNullable<unknown> = Entity> {
  private readonly _pool: Array<T>;
  private readonly _createCallback: PoolCreateCallback<T>;
  private readonly _disposeCallback: PoolDisposeCallback<T>;

  constructor(
    startingPool: Array<T>,
    createCallback: PoolCreateCallback<T>,
    disposeCallback: PoolDisposeCallback<T>,
  ) {
    this._pool = startingPool;
    this._createCallback = createCallback;
    this._disposeCallback = disposeCallback;
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

    return item;
  };

  public release = (instance: T) => {
    this._disposeCallback(instance);

    this._pool.push(instance);
  };

  private readonly _create = (): T => {
    const instance = this._createCallback();

    return instance;
  };
}
