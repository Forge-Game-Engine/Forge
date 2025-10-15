import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectPool } from './object-pool';

describe('ObjectPool', () => {
  let pool: ObjectPool<number>;
  let createCallback: () => number;
  let disposeCallback: (instance: number) => void;
  let hydrateCallback: (instance: number) => void;

  beforeEach(() => {
    createCallback = vi.fn(() => Math.random());
    disposeCallback = vi.fn();
    hydrateCallback = vi.fn();
    pool = new ObjectPool<number>({
      createCallback,
      disposeCallback,
      hydrateCallback,
    });
  });

  describe('create', () => {
    it('should create a new instance when the pool is empty', () => {
      const instance = pool.getOrCreate();

      expect(createCallback).toHaveBeenCalled();
      expect(instance).toBeDefined();
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

  describe('release', () => {
    it('should call the dispose callback when releasing an instance', () => {
      const instance = pool.getOrCreate();
      pool.release(instance);

      expect(disposeCallback).toHaveBeenCalledWith(instance);
    });

    it('should add the instance back to the pool after release', () => {
      const instance = pool.getOrCreate();
      pool.release(instance);

      const reusedInstance = pool.getOrCreate();
      expect(reusedInstance).toBe(instance);
    });

    it('should handle multiple releases correctly', () => {
      const instance1 = pool.getOrCreate();
      const instance2 = pool.getOrCreate();

      pool.release(instance1);
      pool.release(instance2);

      const reusedInstance1 = pool.getOrCreate();
      const reusedInstance2 = pool.getOrCreate();

      expect(reusedInstance1).toBe(instance2); // Last released is reused first
      expect(reusedInstance2).toBe(instance1);
    });
  });

  describe('hydrate', () => {
    it('should call the hydrate callback when getting from pool', () => {
      const instance = pool.getOrCreate();
      pool.release(instance);

      // Create a fresh pool with spy to test hydrate callback
      const hydrateSpy = vi.fn();
      const testPool = new ObjectPool<number>({
        createCallback,
        disposeCallback,
        hydrateCallback: hydrateSpy,
      });

      const testInstance = testPool.getOrCreate();
      testPool.release(testInstance);

      const reusedInstance = testPool.get();

      expect(hydrateSpy).toHaveBeenCalledWith(reusedInstance);
      expect(hydrateSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call hydrate callback when creating new instance', () => {
      const hydrateSpy = vi.fn();
      const testPool = new ObjectPool<number>({
        createCallback,
        disposeCallback,
        hydrateCallback: hydrateSpy,
      });

      testPool.getOrCreate();

      expect(hydrateSpy).not.toHaveBeenCalled();
    });

    it('should hydrate before returning instance from getOrCreate', () => {
      const hydrateSpy = vi.fn();
      const testPool = new ObjectPool<number>({
        createCallback,
        disposeCallback,
        hydrateCallback: hydrateSpy,
      });

      const instance = testPool.getOrCreate();
      testPool.release(instance);

      const reusedInstance = testPool.getOrCreate();

      expect(hydrateSpy).toHaveBeenCalledWith(reusedInstance);
    });
  });

  describe('get', () => {
    it('should throw an error when trying to get from an empty pool', () => {
      expect(() => pool.get()).toThrow('Pool is empty');
    });

    it('should reuse an instance from the pool if available', () => {
      const instance1 = pool.getOrCreate();
      pool.release(instance1);

      const instance2 = pool.getOrCreate();

      expect(createCallback).toHaveBeenCalledTimes(1); // Only called once
      expect(instance2).toBe(instance1); // Reused instance
    });

    it('should return instances in LIFO order', () => {
      const instance1 = pool.getOrCreate();
      const instance2 = pool.getOrCreate();
      const instance3 = pool.getOrCreate();

      pool.release(instance1);
      pool.release(instance2);
      pool.release(instance3);

      expect(pool.get()).toBe(instance3); // Last released, first returned
      expect(pool.get()).toBe(instance2);
      expect(pool.get()).toBe(instance1);
    });
  });

  describe('initialization', () => {
    it('should initialize with a starting pool', () => {
      const startingPool = [1, 2, 3];
      const initializedPool = new ObjectPool<number>(
        {
          createCallback,
          disposeCallback,
          hydrateCallback,
        },
        startingPool,
      );

      expect(initializedPool.get()).toBe(3); // Last-in, first-out
      expect(initializedPool.get()).toBe(2);
      expect(initializedPool.get()).toBe(1);
      expect(() => initializedPool.get()).toThrow('Pool is empty');
    });

    it('should work without dispose callback', () => {
      const poolWithoutDispose = new ObjectPool<number>({
        createCallback,
      });

      const instance = poolWithoutDispose.getOrCreate();

      // Should not throw when releasing without dispose callback
      poolWithoutDispose.release(instance);

      // Verify instance was added back to pool
      const reusedInstance = poolWithoutDispose.get();
      expect(reusedInstance).toBe(instance);
    });

    it('should work without hydrate callback', () => {
      const poolWithoutHydrate = new ObjectPool<number>({
        createCallback,
        disposeCallback,
      });

      const instance = poolWithoutHydrate.getOrCreate();
      poolWithoutHydrate.release(instance);

      // Should not throw when getting without hydrate callback
      const reusedInstance = poolWithoutHydrate.get();
      expect(reusedInstance).toBe(instance);
    });
  });
});
