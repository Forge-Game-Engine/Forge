import { describe, expect, it, vi } from 'vitest';
import { Axis2dAction, setAxis2dActionValue } from './axis-2d-action';

describe('Axis2dAction', () => {
  it('should initialize with the given name and group, and a value of 0', () => {
    const action = new Axis2dAction('pan', 'default');

    expect(action.name).toBe('pan');
    expect(action.inputGroup).toBe('default');
    expect(action.value).toEqual({ x: 0, y: 0 });
  });

  it('should default the input group to "game" when not provided', () => {
    expect(new Axis2dAction('pan').inputGroup).toBe('game');
  });

  it('should raise valueChangeEvent only when the value changes', () => {
    const action = new Axis2dAction('pan');
    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);

    setAxis2dActionValue(action, 1, 2);
    setAxis2dActionValue(action, 1, 2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(action.value);
    expect(action.value).toEqual({ x: 1, y: 2 });
  });
});
