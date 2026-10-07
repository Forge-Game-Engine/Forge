import { describe, expect, it, vi } from 'vitest';
import {
  Axis2dAction,
  axisPressThreshold,
  clearAxis2dActionPresses,
  setAxis2dActionValue,
} from './axis-2d-action';

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

describe('Axis2dAction.presses', () => {
  it('records the value each time its length rises to the press threshold', () => {
    const action = new Axis2dAction('navigate');

    setAxis2dActionValue(action, 0.2, 0);
    setAxis2dActionValue(action, 0, -1);
    setAxis2dActionValue(action, 0, -0.8);
    setAxis2dActionValue(action, 0, 0);
    setAxis2dActionValue(action, 1, 0);

    expect(action.presses).toEqual([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
    ]);
  });

  it('keeps a copy of each press, not the live value', () => {
    const action = new Axis2dAction('navigate');

    setAxis2dActionValue(action, 0, 1);
    setAxis2dActionValue(action, 0, 0);

    expect(action.value).toEqual({ x: 0, y: 0 });
    expect(action.presses).toEqual([{ x: 0, y: 1 }]);
  });

  it('counts a value at exactly the threshold as a press', () => {
    const action = new Axis2dAction('navigate');

    setAxis2dActionValue(action, axisPressThreshold, 0);

    expect(action.presses).toHaveLength(1);
  });

  it('forgets its presses when cleared', () => {
    const action = new Axis2dAction('navigate');

    setAxis2dActionValue(action, 1, 0);
    clearAxis2dActionPresses(action);

    expect(action.presses).toEqual([]);
    expect(action.value).toEqual({ x: 1, y: 0 });
  });
});
