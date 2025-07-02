import { describe, it, expect, beforeEach } from 'vitest';
import { InputAction } from './input-action';

describe('InputAction', () => {
  let action: InputAction;

  beforeEach(() => {
    action = new InputAction('jump');
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('jump');
  });

  it('should not be fired initially', () => {
    expect(action.fired).toBe(false);
  });

  it('should set fired to true when trigger is called', () => {
    action.trigger();
    expect(action.fired).toBe(true);
  });

  it('should set fired to false when reset is called after trigger', () => {
    action.trigger();
    action.reset();
    expect(action.fired).toBe(false);
  });

  it('should keep fired as false if reset is called without trigger', () => {
    action.reset();
    expect(action.fired).toBe(false);
  });

  it('should be able to trigger multiple times', () => {
    action.trigger();
    expect(action.fired).toBe(true);
    action.reset();
    expect(action.fired).toBe(false);
    action.trigger();
    expect(action.fired).toBe(true);
  });
});
