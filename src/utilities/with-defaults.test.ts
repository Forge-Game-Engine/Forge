import { describe, expect, it } from 'vitest';
import { withDefaults } from './with-defaults.js';

describe('withDefaults', () => {
  const defaults = { speed: 5, label: 'a' };

  it('applies the given options over the defaults', () => {
    expect(withDefaults(defaults, { speed: 2 })).toEqual({
      speed: 2,
      label: 'a',
    });
  });

  it('gives an option that is undefined its default, the same as one left out', () => {
    const result = withDefaults(defaults, { speed: undefined, label: 'b' });

    expect(result).toEqual({ speed: 5, label: 'b' });
  });

  it('keeps falsy options that are not undefined', () => {
    expect(withDefaults(defaults, { speed: 0, label: '' })).toEqual({
      speed: 0,
      label: '',
    });
    const nullableDefaults: { value: number | null } = { value: 1 };

    expect(withDefaults(nullableDefaults, { value: null })).toEqual({
      value: null,
    });
  });

  it('keeps options that have no default, and leaves out undefined ones', () => {
    const result = withDefaults(defaults, {
      extra: true,
      missing: undefined as number | undefined,
    });

    expect(result).toEqual({ speed: 5, label: 'a', extra: true });
    expect(Object.hasOwn(result, 'missing')).toBe(false);
  });

  it('gives every default for undefined options', () => {
    expect(withDefaults(defaults, undefined)).toEqual(defaults);
  });

  it('returns a new object, leaving the defaults and options unchanged', () => {
    const options = { speed: 1 };
    const result = withDefaults(defaults, options);

    result.speed = 9;

    expect(result).not.toBe(defaults);
    expect(result).not.toBe(options);
    expect(defaults).toEqual({ speed: 5, label: 'a' });
    expect(options).toEqual({ speed: 1 });
  });
});
