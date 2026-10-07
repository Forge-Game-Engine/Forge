import { describe, expect, it, vi } from 'vitest';
import {
  clearTriggerAction,
  fireTriggerAction,
  TriggerAction,
} from './trigger-action';

describe('TriggerAction', () => {
  it('should initialize with the given name and group, not triggered', () => {
    const action = new TriggerAction('jump', 'default');

    expect(action.name).toBe('jump');
    expect(action.inputGroup).toBe('default');
    expect(action.isTriggered).toBe(false);
  });

  it('should default the input group to "game" when not provided', () => {
    expect(new TriggerAction('jump').inputGroup).toBe('game');
  });

  it('should be triggered once fired, until cleared, raising triggerEvent on each fire', () => {
    const action = new TriggerAction('jump');
    const listener = vi.fn();

    action.triggerEvent.registerListener(listener);

    fireTriggerAction(action);
    expect(action.isTriggered).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    clearTriggerAction(action);
    expect(action.isTriggered).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
