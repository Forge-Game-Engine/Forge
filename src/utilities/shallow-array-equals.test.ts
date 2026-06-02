import { describe, expect, it } from 'vitest';
import { shallowArraysEqual } from './shallow-array-equals';

describe('shallowArraysEqual', () => {
  it('returns true when both references are same', () => {
    const arr = [1, 2, 3];
    expect(shallowArraysEqual(arr, arr)).toBe(true);
  });

  it('returns true for equal primitive contents in different arrays', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(shallowArraysEqual(a, b)).toBe(true);
  });

  it('returns false for different lengths', () => {
    expect(shallowArraysEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false when same items but different order', () => {
    expect(shallowArraysEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it('compares object references shallowly', () => {
    const obj = { x: 1 };
    const a = [obj, { y: 2 }];
    const b = [obj, { y: 2 }];

    // first element is same reference, second is different object with same shape
    expect(shallowArraysEqual(a, b)).toBe(false);

    const c = [obj, { y: 2 }];
    const d = [obj, { y: 2 }];

    // replace second with same reference
    c[1] = d[1];
    expect(shallowArraysEqual(c, d)).toBe(true);
  });

  it('handles empty arrays', () => {
    expect(shallowArraysEqual([], [])).toBe(true);
  });

  it('works with readonly arrays', () => {
    const a: readonly number[] = [1, 2];
    const b: readonly number[] = [1, 2];
    expect(shallowArraysEqual(a, b)).toBe(true);
  });
});
