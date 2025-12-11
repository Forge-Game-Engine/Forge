import { describe, expect, it } from 'vitest';
import { isString } from './is-string';

describe('isString', () => {
  it('returns true for string primitives', () => {
    expect(isString('hello')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(String('world'))).toBe(true); // String() produces a primitive
    expect(isString(`template literal`)).toBe(true);
  });

  it('returns false for String objects (wrappers) and non-string types', () => {
    // eslint-disable-next-line sonarjs/no-primitive-wrappers
    expect(isString(new String('abc'))).toBe(false); // String object -> typeof "object"
    expect(isString(123)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString(Symbol('s'))).toBe(false);
    expect(isString(10n)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString([])).toBe(false);
    expect(isString(() => {})).toBe(false);
  });
});
