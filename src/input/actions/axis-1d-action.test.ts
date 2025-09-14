import { beforeEach, describe, expect, it } from 'vitest';
import { Axis1dAction } from './axis-1d-action';

describe('InputAxis1d', () => {
  let action: Axis1dAction;

  beforeEach(() => {
    action = new Axis1dAction('zoom');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('zoom');
  });

  it('should initialize value to 0', () => {
    expect(action.value).toBe(0);
  });

  it('should set value correctly', () => {
    action.set(1);
    expect(action.value).toBe(1);

    action.set(-1);
    expect(action.value).toBe(-1);
  });

  it('should reset value to 0', () => {
    action.set(1);
    expect(action.value).toBe(1);

    action.reset();
    expect(action.value).toBe(0);
  });
});
