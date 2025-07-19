import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputGroup } from './input-group';
import { KeyboardInputSource } from './input-sources';
import { InputManager } from './input-manager';
import { buttonMoments, keyCodes } from './constants';
import { TriggerAction } from './actions';
import { KeyboardTriggerBinding } from './bindings';

describe('InputGroup', () => {
  let group: InputGroup;
  let manager: InputManager;
  let source: KeyboardInputSource;
  let action: TriggerAction;

  beforeEach(() => {
    group = new InputGroup('test-group');
    manager = new InputManager();
    source = new KeyboardInputSource(manager);
    action = new TriggerAction('test-action');
  });

  it('should initialize with the given name', () => {
    expect(group.name).toBe('test-group');
  });

  it('should initialize with an empty set of triggerActions', () => {
    expect(group.triggerActions.size).toBe(0);
  });

  it('should not trigger any actions if triggerActions is empty', () => {
    const binding = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    group.dispatchTriggerAction(binding);

    expect(group.triggerActions.size).toBe(0);
    expect(action.isTriggered).toBe(false);
  });

  it('should trigger action if binding matches', () => {
    const binding = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(binding, group);
    group.triggerActions.add(action);

    group.dispatchTriggerAction(binding);

    expect(action.isTriggered).toBe(true);
  });

  it('should not trigger action if binding does not match', () => {
    const triggerBinding = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(triggerBinding, group);
    group.triggerActions.add(action);

    const dispatchedBinding1 = new KeyboardTriggerBinding(
      { keyCode: keyCodes.a, moment: buttonMoments.down }, // different key-code
      source,
    );

    group.dispatchTriggerAction(dispatchedBinding1);

    expect(action.isTriggered).toBe(false);

    const dispatchedBinding2 = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.up }, // same key-code, different moment
      source,
    );

    group.dispatchTriggerAction(dispatchedBinding2);

    expect(action.isTriggered).toBe(false);

    const dispatchedBinding3 = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down }, // same key-code and moment (even though different instance)
      source,
    );

    group.dispatchTriggerAction(dispatchedBinding3);

    expect(action.isTriggered).toBe(true);
  });

  it('should skip actions with no bindings for the group', () => {
    const activeGroup = new InputGroup('active-group');
    const inactiveGroup = new InputGroup('inactive-group');

    const binding = new KeyboardTriggerBinding(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(binding, inactiveGroup);

    activeGroup.triggerActions.add(action);
    inactiveGroup.triggerActions.add(action);

    activeGroup.dispatchTriggerAction(binding);

    expect(action.isTriggered).toBe(false);
  });
});
