import { beforeEach, describe, expect, it } from 'vitest';
import { TriggerAction } from './trigger-action';
import { InputGroup } from '../input-group';
import { ActionableInputSource, KeyboardInputSource } from '../input-sources';
import { InputManager } from '../input-manager';
import { buttonMoments, keyCodes } from '../constants';
import { KeyboardTriggerBinding } from '../bindings';

describe('InputAction', () => {
  let action: TriggerAction;
  let group: InputGroup;
  let inputSource: ActionableInputSource;
  let manager: InputManager;

  beforeEach(() => {
    action = new TriggerAction('jump');
    group = new InputGroup('test');
    manager = new InputManager();
    inputSource = new KeyboardInputSource(manager);
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('jump');
  });

  it('should not be triggered initially', () => {
    expect(action.isTriggered).toBe(false);
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

  it('should bind sources correctly', () => {
    const binding = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      inputSource,
    );

    action.bind(binding, group);

    const bindings = action.bindings.get(group)?.values().toArray();

    expect(bindings?.length).toBe(1);
    expect(bindings?.[0]?.id).toBe(binding.id);
  });
});
