import { describe, expect, it, vi } from 'vitest';
import { Axis1dAction, setAxis1dActionValue } from './axis-1d-action';

describe('Axis1dAction', () => {
  it('should initialize with the given name and group, and a value of 0', () => {
    const action = new Axis1dAction('zoom', 'default');

    expect(action.name).toBe('zoom');
    expect(action.inputGroup).toBe('default');
    expect(action.value).toBe(0);
  });

  it('should default the input group to "game" when not provided', () => {
    expect(new Axis1dAction('zoom').inputGroup).toBe('game');
  });

  it('should clamp written values to the range -1 to 1', () => {
    const action = new Axis1dAction('zoom');

    setAxis1dActionValue(action, 2);
    expect(action.value).toBe(1);

    setAxis1dActionValue(action, -1.5);
    expect(action.value).toBe(-1);

    setAxis1dActionValue(action, 0.25);
    expect(action.value).toBe(0.25);
  });

  it('should raise valueChangeEvent only when the clamped value changes', () => {
    const action = new Axis1dAction('zoom');
    const listener = vi.fn();

    action.valueChangeEvent.registerListener(listener);

    setAxis1dActionValue(action, 1);
    setAxis1dActionValue(action, 1);
    setAxis1dActionValue(action, 2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });
});
