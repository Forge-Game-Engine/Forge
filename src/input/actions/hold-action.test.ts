import { beforeEach, describe, expect, it } from 'vitest';
import { HoldAction } from './hold-action';
import { InputGroup } from '../input-group';
import { KeyboardInputSource } from '../input-sources';
import { InputManager } from '../input-manager';
import { keyCodes } from '../constants';
import { KeyboardHoldInteraction } from '../interactions';

describe('HoldAction', () => {
  let action: HoldAction;
  let group: InputGroup;
  let inputSource: KeyboardInputSource;
  let manager: InputManager;

  beforeEach(() => {
    manager = new InputManager();
    action = new HoldAction('accelerate', manager);
    group = new InputGroup('test');
    inputSource = new KeyboardInputSource(manager);
  });

  it('should set the name property from constructor', () => {
    expect(action.name).toBe('accelerate');
  });

  it('should not be held initially', () => {
    expect(action.isHeld).toBe(false);
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

  it('should bind sources correctly', () => {
    const interaction = new KeyboardHoldInteraction(
      { keyCode: keyCodes.w },
      inputSource,
    );

    action.bind(interaction, group);

    const interactions = action.interactions.get(group)?.values().toArray();

    expect(interactions?.length).toBe(1);
    expect(interactions?.[0]?.id).toBe(interaction.id);
  });
});
