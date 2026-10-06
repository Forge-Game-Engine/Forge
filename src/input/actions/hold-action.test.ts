import { describe, expect, it, vi } from 'vitest';
import { HoldAction, setHoldActionHeld } from './hold-action';

describe('HoldAction', () => {
  it('should initialize with the given name and group, not held', () => {
    const action = new HoldAction('accelerate', 'default');

    expect(action.name).toBe('accelerate');
    expect(action.inputGroup).toBe('default');
    expect(action.isHeld).toBe(false);
  });

  it('should default the input group to "game" when not provided', () => {
    expect(new HoldAction('accelerate').inputGroup).toBe('game');
  });

  it('should raise holdStartEvent and holdEndEvent only when the held state changes', () => {
    const action = new HoldAction('accelerate');
    const startListener = vi.fn();
    const endListener = vi.fn();

    action.holdStartEvent.registerListener(startListener);
    action.holdEndEvent.registerListener(endListener);

    setHoldActionHeld(action, false);
    expect(endListener).not.toHaveBeenCalled();

    setHoldActionHeld(action, true);
    setHoldActionHeld(action, true);
    expect(action.isHeld).toBe(true);
    expect(startListener).toHaveBeenCalledTimes(1);

    setHoldActionHeld(action, false);
    expect(action.isHeld).toBe(false);
    expect(endListener).toHaveBeenCalledTimes(1);
  });
});
