import { beforeEach, describe, expect, it } from 'vitest';
import { TriggerAction } from './trigger-action';

describe('InputAction', () => {
  let action: TriggerAction;

  beforeEach(() => {
    action = new TriggerAction('jump', 'default');
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('jump');
  });

  it('should not be triggered initially', () => {
    expect(action.isTriggered).toBe(false);
  });

  it('should initialize with given group', () => {
    expect(action.inputGroup).toBe('default');
  });

  it('should set triggered to true when trigger is called', () => {
    action.trigger();
    expect(action.isTriggered).toBe(true);
  });

  it('should set triggered to false when reset is called after trigger', () => {
    action.trigger();
    action.reset();
    expect(action.isTriggered).toBe(false);
  });

  it('should keep triggered as false if reset is called without trigger', () => {
    action.reset();
    expect(action.isTriggered).toBe(false);
  });

  it('should be able to trigger multiple times', () => {
    action.trigger();
    expect(action.isTriggered).toBe(true);
    action.reset();
    expect(action.isTriggered).toBe(false);
    action.trigger();
    expect(action.isTriggered).toBe(true);
  });
});
