import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Axis2dAction } from './axis-2d-action';
import { actionResetTypes } from '../constants';

describe('InputAxis2d', () => {
  let action: Axis2dAction;

  beforeEach(() => {
    action = new Axis2dAction('pan', 'default');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('pan');
  });

  it('should initialize with given group', () => {
    expect(action.inputGroup).toBe('default');
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

  it('should default the input group to "game" when not provided', () => {
    const defaultGroupAction = new Axis2dAction('pan');
    expect(defaultGroupAction.inputGroup).toBe('game');
  });

  it('should not reset the value when the reset type is noReset', () => {
    const noResetAction = new Axis2dAction(
      'pan',
      'default',
      actionResetTypes.noReset,
    );

    noResetAction.set(1, 1);
    noResetAction.reset();

    expect(noResetAction.value.x).toBe(1);
    expect(noResetAction.value.y).toBe(1);
  });

  it('should raise valueChangeEvent when the value changes', () => {
    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);
    action.set(1, 2);

    expect(listener).toHaveBeenCalledWith(action.value);
    expect(action.value.x).toBe(1);
    expect(action.value.y).toBe(2);
  });

  it('should not raise valueChangeEvent when set to the same value', () => {
    action.set(1, 2);

    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);
    action.set(1, 2);

    expect(listener).not.toHaveBeenCalled();
  });
});
