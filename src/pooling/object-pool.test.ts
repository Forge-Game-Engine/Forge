import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectPool } from './object-pool';

describe('ObjectPool', () => {
  let pool: ObjectPool<number>;
  let createCallback: () => number;
  let disposeCallback: (instance: number) => void;

  beforeEach(() => {
    createCallback = vi.fn(() => Math.random());
    disposeCallback = vi.fn();
    pool = new ObjectPool<number>([], createCallback, disposeCallback);
  });

  it('should create a new instance when the pool is empty', () => {
    const instance = pool.getOrCreate();

    expect(createCallback).toHaveBeenCalled();
    expect(instance).toBeDefined();
  });

  it('should reuse an instance from the pool if available', () => {
    const instance1 = pool.getOrCreate();
    pool.release(instance1);

    const instance2 = pool.getOrCreate();

    expect(createCallback).toHaveBeenCalledTimes(1); // Only called once
    expect(instance2).toBe(instance1); // Reused instance
  });

  it('should throw an error when trying to get from an empty pool', () => {
    expect(() => pool.get()).toThrow('Pool is empty');
  });

  it('should call the dispose callback when releasing an instance', () => {
    const instance = pool.getOrCreate();
    pool.release(instance);

    expect(disposeCallback).toHaveBeenCalledWith(instance);
  });

  it('should handle multiple releases and reuses correctly', () => {
    const instance1 = pool.getOrCreate();
    const instance2 = pool.getOrCreate();

    pool.release(instance1);
    pool.release(instance2);

    const reusedInstance1 = pool.getOrCreate();
    const reusedInstance2 = pool.getOrCreate();

    expect(reusedInstance1).toBe(instance2); // Last released is reused first
    expect(reusedInstance2).toBe(instance1);
  });

  it('should initialize with a starting pool', () => {
    const startingPool = [1, 2, 3];
    const initializedPool = new ObjectPool<number>(
      startingPool,
      createCallback,
      disposeCallback,
    );

    expect(initializedPool.get()).toBe(3); // Last-in, first-out
    expect(initializedPool.get()).toBe(2);
    expect(initializedPool.get()).toBe(1);
    expect(() => initializedPool.get()).toThrow('Pool is empty');
  });

  it('should create a new instance if the pool is empty and getOrCreate is called', () => {
    const instance = pool.getOrCreate();

    expect(createCallback).toHaveBeenCalled();
    expect(instance).toBeDefined();
  });

  it('should not add newly created instances to the pool until released', () => {
    const instance = pool.getOrCreate();

    // Ensure the pool is still empty after creating a new instance
    expect(() => pool.get()).toThrow('Pool is empty');

    // Release the instance and ensure it is now in the pool
    pool.release(instance);
    const reusedInstance = pool.get();

    expect(reusedInstance).toBe(instance);
  });
});
