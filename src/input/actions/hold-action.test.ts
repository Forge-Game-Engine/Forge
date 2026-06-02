import { beforeEach, describe, expect, it } from 'vitest';
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
});
