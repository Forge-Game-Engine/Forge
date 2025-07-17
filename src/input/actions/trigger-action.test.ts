import { beforeEach, describe, expect, it } from 'vitest';
import { TriggerAction } from './trigger-action';

describe('InputAction', () => {
  let action: TriggerAction;

  beforeEach(() => {
    action = new TriggerAction('jump');
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('jump');
  });

  it('should not be triggered initially', () => {
    expect(action.lastBindingTriggered).toBe(false);
  });

  it('should set triggered to true when trigger is called', () => {
    action.trigger();
    expect(action.lastBindingTriggered).toBe(true);
  });

  it('should set triggered to false when reset is called after trigger', () => {
    action.trigger();
    action.reset();
    expect(action.lastBindingTriggered).toBe(false);
  });

  it('should keep triggered as false if reset is called without trigger', () => {
    action.reset();
    expect(action.lastBindingTriggered).toBe(false);
  });

  it('should be able to trigger multiple times', () => {
    action.trigger();
    expect(action.lastBindingTriggered).toBe(true);
    action.reset();
    expect(action.lastBindingTriggered).toBe(false);
    action.trigger();
    expect(action.lastBindingTriggered).toBe(true);
  });

  it('should bind sources correctly', () => {
    action.bind({
      bindingId: 'mouse1',
      sourceName: 'mouse',
      displayText: 'Mouse Left Down',
    });

    expect(action.bindings.length).toBe(1);
    expect(action.bindings[0].bindingId).toBe('mouse1');
    expect(action.bindings[0].displayText).toBe('Mouse Left Down');

    action.bind({
      bindingId: 'keyboard1',
      sourceName: 'keyboard',
      displayText: 'Space Down',
    });

    expect(action.bindings.length).toBe(2);
    expect(action.bindings[1].bindingId).toBe('keyboard1');
    expect(action.bindings[1].displayText).toBe('Space Down');
  });
});
