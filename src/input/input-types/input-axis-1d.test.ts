import { beforeEach, describe, expect, it } from 'vitest';
import { InputAxis1d } from './input-axis-1d';

describe('InputAxis1d', () => {
  let axis: InputAxis1d;

  beforeEach(() => {
    axis = new InputAxis1d('zoom');
  });

  it('should initialize with the given name', () => {
    expect(axis.name).toBe('zoom');
  });

  it('should initialize value to 0', () => {
    expect(axis.value).toBe(0);
  });

  it('should set value correctly', () => {
    axis.set(0.5);
    expect(axis.value).toBe(0.5);

    axis.set(-1);
    expect(axis.value).toBe(-1);
  });

  it('should reset value to 0', () => {
    axis.set(1);
    expect(axis.value).toBe(1);

    axis.reset();
    expect(axis.value).toBe(0);
  });
});
