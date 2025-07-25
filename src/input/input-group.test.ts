import { beforeEach, describe, expect, it } from 'vitest';
import { InputGroup } from './input-group';
import { KeyboardInputSource } from './input-sources';
import { InputManager } from './input-manager';
import { buttonMoments, keyCodes } from './constants';
import { TriggerAction } from './actions';
import { KeyboardTriggerInteraction } from './interactions';

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
    const interaction = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    group.dispatchTriggerAction(interaction);

    expect(group.triggerActions.size).toBe(0);
    expect(action.isTriggered).toBe(false);
  });

  it('should trigger action if interaction matches', () => {
    const interaction = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(interaction, group);

    group.dispatchTriggerAction(interaction);

    expect(action.isTriggered).toBe(true);
  });

  it('should not trigger action if interaction does not match', () => {
    const triggerInteraction = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(triggerInteraction, group);

    const dispatchedInteraction1 = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.a, moment: buttonMoments.down }, // different key-code
      source,
    );

    group.dispatchTriggerAction(dispatchedInteraction1);

    expect(action.isTriggered).toBe(false);

    const dispatchedInteraction2 = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.up }, // same key-code, different moment
      source,
    );

    group.dispatchTriggerAction(dispatchedInteraction2);

    expect(action.isTriggered).toBe(false);

    const dispatchedInteraction3 = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down }, // same key-code and moment (even though different instance)
      source,
    );

    group.dispatchTriggerAction(dispatchedInteraction3);

    expect(action.isTriggered).toBe(true);
  });

  it('should skip actions with no interaction for the group', () => {
    const activeGroup = new InputGroup('active-group');
    const inactiveGroup = new InputGroup('inactive-group');

    const interaction = new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      source,
    );

    action.bind(interaction, inactiveGroup);

    activeGroup.dispatchTriggerAction(interaction);

    expect(action.isTriggered).toBe(false);
  });
});
