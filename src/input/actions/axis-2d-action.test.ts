import { beforeEach, describe, expect, it } from 'vitest';
import { Axis2dAction } from './axis-2d-action';

describe('InputAxis2d', () => {
  let action: Axis2dAction;

  beforeEach(() => {
    action = new Axis2dAction('pan');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('pan');
  });

  it('should initialize value to 0', () => {
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
  });

  it('should set value correctly', () => {
    action.set(0.5, 0.5);
    expect(action.value.x).toBe(0.5);
    expect(action.value.y).toBe(0.5);

    action.set(-1, -1);
    expect(action.value.x).toBe(-1);
    expect(action.value.y).toBe(-1);
  });

  it('should reset value to 0', () => {
    action.set(1, 1);
    expect(action.value.x).toBe(1);
    expect(action.value.y).toBe(1);

    action.reset();
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
  });
});
