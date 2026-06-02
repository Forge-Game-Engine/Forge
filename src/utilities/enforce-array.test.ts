import { describe, expect, it } from 'vitest';
import { enforceArray } from './enforce-array.js';

describe('enforceArray', () => {
  it('returns the same array reference when given an array', () => {
    const arr = [1, 2, 3];
    const result = enforceArray(arr);
    expect(result).toBe(arr);
  });

  it('wraps a non-array primitive value in an array', () => {
    expect(enforceArray(5)).toEqual([5]);
    expect(enforceArray('hello')).toEqual(['hello']);
    expect(enforceArray(true)).toEqual([true]);
  });

  it('does not wrap null and undefined in an array', () => {
    expect(enforceArray(null)).toEqual([]);
    expect(enforceArray(undefined)).toEqual([]);
  });

  it('preserves object references when given an array of objects', () => {
    const obj = { a: 1 };
    const arr = [obj];
    const result = enforceArray(arr);
    expect(result).toBe(arr);
    expect(result[0]).toBe(obj);
  });

  it('wraps an object when it is not already an array', () => {
    const obj = { b: 2 };
    const result = enforceArray(obj);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([obj]);
    expect(result[0]).toBe(obj);
  });
});
