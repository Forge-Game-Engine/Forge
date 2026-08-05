import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldAction } from './hold-action';

describe('HoldAction', () => {
  let action: HoldAction;

  beforeEach(() => {
    action = new HoldAction('accelerate', 'default');
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('accelerate');
  });

  it('should not be held initially', () => {
    expect(action.isHeld).toBe(false);
  });

  it('should initialize with given group', () => {
    expect(action.inputGroup).toBe('default');
  });

  it('should set held to true when start hold is called', () => {
    action.startHold();
    expect(action.isHeld).toBe(true);
  });

  it('should set held to false when reset is called after hold', () => {
    action.startHold();
    action.endHold();
    expect(action.isHeld).toBe(false);
  });

  it('should keep held as false if reset is called without holding', () => {
    action.endHold();
    expect(action.isHeld).toBe(false);
  });

  it('should be able to hold multiple times', () => {
    action.startHold();
    expect(action.isHeld).toBe(true);
    action.endHold();
    expect(action.isHeld).toBe(false);
    action.startHold();
    expect(action.isHeld).toBe(true);
  });

  it('should default the input group to "game" when not provided', () => {
    const defaultGroupAction = new HoldAction('accelerate');
    expect(defaultGroupAction.inputGroup).toBe('game');
  });

  it('should raise holdStartEvent when started and holdEndEvent when ended', () => {
    const startListener = vi.fn();
    const endListener = vi.fn();

    action.holdStartEvent.registerListener(startListener);
    action.holdEndEvent.registerListener(endListener);

    action.startHold();
    expect(startListener).toHaveBeenCalledTimes(1);
    expect(endListener).not.toHaveBeenCalled();

    action.endHold();
    expect(endListener).toHaveBeenCalledTimes(1);
  });
});
