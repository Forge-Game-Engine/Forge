import { describe, expect, it } from 'vitest';
import { isNumber } from './is-number';

describe('isNumber', () => {
  it.each([5, 0, -1, 1.23, Infinity, -Infinity])(
    'returns true for numeric primitive %p',
    (value) => {
      expect(isNumber(value)).toBe(true);
    },
  );

  it.each([
    '5',
    '',
    '0',
    true,
    false,
    null,
    undefined,
    {},
    { value: 5 },
    [],
    [1],
    () => 1,
    Symbol('1'),
    5n,
    new Date(),
    NaN,
    Number.NaN,
    // eslint-disable-next-line sonarjs/no-primitive-wrappers
    new Number(5),
  ])('returns false for non-number value %p', (value) => {
    expect(isNumber(value)).toBe(false);
  });

  it('narrows type when used as a type guard', () => {
    const unknownValue: unknown = 42;

    if (isNumber(unknownValue)) {
      // inside this block TypeScript should treat unknownValue as number
      const doubled = unknownValue * 2;
      expect(doubled).toBe(84);
    } else {
      // not expected for this test
      expect(true).toBe(false);
    }
  });
});
