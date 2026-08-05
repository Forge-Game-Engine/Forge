import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Axis1dAction } from './axis-1d-action';
import { actionResetTypes } from '../constants';

describe('InputAxis1d', () => {
  let action: Axis1dAction;

  beforeEach(() => {
    action = new Axis1dAction('zoom', 'default');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('zoom');
  });

  it('should initialize value to 0', () => {
    expect(action.value).toBe(0);
  });

  it('should initialize with given group', () => {
    expect(action.inputGroup).toBe('default');
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

  it('should default the input group to "game" when not provided', () => {
    const defaultGroupAction = new Axis1dAction('zoom');
    expect(defaultGroupAction.inputGroup).toBe('game');
  });

  it('should not reset the value when the reset type is noReset', () => {
    const noResetAction = new Axis1dAction(
      'zoom',
      'default',
      actionResetTypes.noReset,
    );

    noResetAction.set(1);
    noResetAction.reset();

    expect(noResetAction.value).toBe(1);
  });

  it('should raise valueChangeEvent when the value changes', () => {
    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);
    action.set(1);

    expect(listener).toHaveBeenCalledWith(1);
  });

  it('should not raise valueChangeEvent when set to the same value', () => {
    action.set(1);

    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);
    action.set(1);

    expect(listener).not.toHaveBeenCalled();
  });
});
