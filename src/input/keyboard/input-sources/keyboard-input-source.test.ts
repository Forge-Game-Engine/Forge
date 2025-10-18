import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInputSource } from './keyboard-input-source';
import { buttonMoments, keyCodes } from '../../constants';
import { InputManager } from '../../input-manager';
import { HoldAction, TriggerAction } from '../../actions';
import { KeyboardHoldBinding, KeyboardTriggerBinding } from '../bindings';

describe('KeyboardInputSource', () => {
  const group = 'default';

  let inputManager: InputManager;
  let source: KeyboardInputSource;
  let keyUpAction: TriggerAction;
  let keyDownAction: TriggerAction;
  let keyHoldAction: HoldAction;

  beforeEach(() => {
    inputManager = new InputManager();
    inputManager.setActiveGroup(group);
    source = new KeyboardInputSource(inputManager);

    keyUpAction = new TriggerAction('keyUpAction', group);
    keyDownAction = new TriggerAction('keyDownAction', group);
    keyHoldAction = new HoldAction('holdAction', group);

    inputManager.addResettable(keyUpAction);
    inputManager.addResettable(keyDownAction);

    source.triggerBindings.add(
      new KeyboardTriggerBinding(keyUpAction, keyCodes.a, buttonMoments.up),
    );

    source.triggerBindings.add(
      new KeyboardTriggerBinding(keyDownAction, keyCodes.s, buttonMoments.down),
    );

    source.holdBindings.add(
      new KeyboardHoldBinding(keyHoldAction, keyCodes.space),
    );
  });

  it('dispatches key up trigger actions', () => {
    expect(keyUpAction.isTriggered).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.a }));
    expect(keyUpAction.isTriggered).toBe(true);

    inputManager.reset();
    expect(keyUpAction.isTriggered).toBe(false);
  });

  it('does not dispatch key ups that do not match', () => {
    expect(keyUpAction.isTriggered).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.p }));
    expect(keyUpAction.isTriggered).toBe(false);
  });

  it('dispatches key down trigger actions', () => {
    expect(keyDownAction.isTriggered).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.s }));
    expect(keyDownAction.isTriggered).toBe(true);

    inputManager.reset();
    expect(keyDownAction.isTriggered).toBe(false);
  });

  it('does not dispatch key downs that do not match', () => {
    expect(keyDownAction.isTriggered).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));
    expect(keyDownAction.isTriggered).toBe(false);
  });

  it('dispatches key hold actions', () => {
    expect(keyHoldAction.isHeld).toBe(false);

    const holdStartEventHandler = vi.fn();
    const holdEndEventHandler = vi.fn();

    keyHoldAction.holdStartEvent.registerListener(holdStartEventHandler);
    keyHoldAction.holdEndEvent.registerListener(holdEndEventHandler);

    expect(holdStartEventHandler).not.toHaveBeenCalled();
    expect(holdEndEventHandler).not.toHaveBeenCalled();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: keyCodes.space }),
    );

    expect(keyHoldAction.isHeld).toBe(true);
    expect(holdStartEventHandler).toHaveBeenCalledTimes(1);
    expect(holdEndEventHandler).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.space }));

    expect(keyHoldAction.isHeld).toBe(false);
    expect(holdStartEventHandler).toHaveBeenCalledTimes(1);
    expect(holdEndEventHandler).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch key holds that are browser auto repeats', () => {
    // see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat

    expect(keyHoldAction.isHeld).toBe(false);

    const holdStartEventHandler = vi.fn();
    const holdEndEventHandler = vi.fn();

    keyHoldAction.holdStartEvent.registerListener(holdStartEventHandler);
    keyHoldAction.holdEndEvent.registerListener(holdEndEventHandler);

    expect(holdStartEventHandler).not.toHaveBeenCalled();
    expect(holdEndEventHandler).not.toHaveBeenCalled();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: keyCodes.space, repeat: true }),
    );

    expect(keyHoldAction.isHeld).toBe(false);
    expect(holdStartEventHandler).not.toHaveBeenCalled();
    expect(holdEndEventHandler).not.toHaveBeenCalled();
  });
});
