import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInputSource } from './keyboard-input-source';
import { actionResetTypes, buttonMoments, keyCodes } from '../../constants';
import { InputManager } from '../../input-manager';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from '../../actions';
import {
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardTriggerBinding,
} from '../bindings';

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

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));
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

  it('does not dispatch key ups that are browser auto repeats', () => {
    // see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));

    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: keyCodes.a, repeat: true }),
    );

    expect(keyUpAction.isTriggered).toBe(false);
  });

  it('dispatches axis1d bindings on key down and key up', () => {
    const axis1dAction = new Axis1dAction('axis1dAction', group);

    inputManager.addAxis1dActions(axis1dAction);
    source.axis1dBindings.add(
      new KeyboardAxis1dBinding(axis1dAction, keyCodes.d, keyCodes.a),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.d }));
    expect(axis1dAction.value).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));
    expect(axis1dAction.value).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));
    expect(axis1dAction.value).toBe(-1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.a }));
    expect(axis1dAction.value).toBe(0);
  });

  it('dispatches axis2d bindings on key down and key up', () => {
    const axis2dAction = new Axis2dAction('axis2dAction', group);

    inputManager.addAxis2dActions(axis2dAction);
    source.axis2dBindings.add(
      new KeyboardAxis2dBinding(
        axis2dAction,
        keyCodes.w,
        keyCodes.s,
        keyCodes.d,
        keyCodes.a,
      ),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.w }));
    expect(axis2dAction.value.y).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.d }));
    expect(axis2dAction.value.x).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.w }));
    expect(axis2dAction.value.y).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));
    expect(axis2dAction.value.x).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.s }));
    expect(axis2dAction.value.y).toBe(-1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));
    expect(axis2dAction.value.x).toBe(-1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.s }));
    expect(axis2dAction.value.y).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.a }));
    expect(axis2dAction.value.x).toBe(0);
  });

  it('stops dispatching after stop is called', () => {
    source.stop();

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.a }));
    expect(keyUpAction.isTriggered).toBe(false);
  });

  it('combines several axis1d bindings for the same action, clamped to -1 to 1', () => {
    const axis1dAction = new Axis1dAction(
      'axis1dAction',
      group,
      actionResetTypes.noReset,
    );

    inputManager.addAxis1dActions(axis1dAction);
    source.axis1dBindings.add(
      new KeyboardAxis1dBinding(axis1dAction, keyCodes.d, keyCodes.a),
    );
    source.axis1dBindings.add(
      new KeyboardAxis1dBinding(
        axis1dAction,
        keyCodes.arrowRight,
        keyCodes.arrowLeft,
      ),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.d }));
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: keyCodes.arrowRight }),
    );
    expect(axis1dAction.value).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));
    expect(axis1dAction.value).toBe(1);

    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: keyCodes.arrowRight }),
    );
    expect(axis1dAction.value).toBe(0);
  });

  it('combines several axis2d bindings for the same action, clamped to -1 to 1', () => {
    const axis2dAction = new Axis2dAction(
      'axis2dAction',
      group,
      actionResetTypes.noReset,
    );

    inputManager.addAxis2dActions(axis2dAction);
    source.axis2dBindings.add(
      new KeyboardAxis2dBinding(
        axis2dAction,
        keyCodes.w,
        keyCodes.s,
        keyCodes.d,
        keyCodes.a,
      ),
    );
    source.axis2dBindings.add(
      new KeyboardAxis2dBinding(
        axis2dAction,
        keyCodes.arrowUp,
        keyCodes.arrowDown,
        keyCodes.arrowRight,
        keyCodes.arrowLeft,
      ),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.w }));
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: keyCodes.arrowUp }),
    );
    expect(axis2dAction.value.y).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.w }));
    expect(axis2dAction.value.y).toBe(1);

    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: keyCodes.arrowUp }),
    );
    expect(axis2dAction.value.y).toBe(0);
  });

  it('does not let a key up for a key it never saw pressed move an axis', () => {
    const axis1dAction = new Axis1dAction(
      'axis1dAction',
      group,
      actionResetTypes.noReset,
    );

    inputManager.addAxis1dActions(axis1dAction);
    source.axis1dBindings.add(
      new KeyboardAxis1dBinding(axis1dAction, keyCodes.d, keyCodes.a),
    );

    window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));
    expect(axis1dAction.value).toBe(0);
  });

  describe('keys typed into editable elements', () => {
    const dispatchKey = (
      target: EventTarget,
      type: 'keydown' | 'keyup',
      code: string,
    ): void => {
      target.dispatchEvent(
        new KeyboardEvent(type, { code, bubbles: true, composed: true }),
      );
    };

    let input: HTMLInputElement;

    beforeEach(() => {
      input = document.createElement('input');
      document.body.appendChild(input);
    });

    it('ignores a key pressed in an <input>, and its release', () => {
      dispatchKey(input, 'keydown', keyCodes.s);
      expect(keyDownAction.isTriggered).toBe(false);

      dispatchKey(input, 'keydown', keyCodes.a);
      dispatchKey(input, 'keyup', keyCodes.a);
      expect(keyUpAction.isTriggered).toBe(false);

      input.remove();
    });

    it('ignores keys pressed in a <textarea>, a <select> and a contentEditable element', () => {
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const editable = document.createElement('div');

      editable.contentEditable = 'true';
      // jsdom doesn't implement isContentEditable.
      Object.defineProperty(editable, 'isContentEditable', { value: true });

      for (const element of [textarea, select, editable]) {
        document.body.appendChild(element);
        dispatchKey(element, 'keydown', keyCodes.s);
        element.remove();
      }

      expect(keyDownAction.isTriggered).toBe(false);
      input.remove();
    });

    it('ignores a key pressed in an <input> inside a shadow root', () => {
      const host = document.createElement('div');
      const shadowInput = document.createElement('input');

      host.attachShadow({ mode: 'open' }).appendChild(shadowInput);
      document.body.appendChild(host);

      dispatchKey(shadowInput, 'keydown', keyCodes.s);
      expect(keyDownAction.isTriggered).toBe(false);

      host.remove();
      input.remove();
    });

    it('still releases a key held before typing started', () => {
      dispatchKey(window, 'keydown', keyCodes.space);
      expect(keyHoldAction.isHeld).toBe(true);

      dispatchKey(input, 'keyup', keyCodes.space);
      expect(keyHoldAction.isHeld).toBe(false);

      input.remove();
    });

    it('does not report a key released outside the input after being pressed in it', () => {
      dispatchKey(input, 'keydown', keyCodes.a);
      input.remove();
      dispatchKey(window, 'keyup', keyCodes.a);

      expect(keyUpAction.isTriggered).toBe(false);
    });
  });

  describe('switching the active input group', () => {
    const menuGroup = 'menu';

    let move: Axis1dAction;
    let move2d: Axis2dAction;

    beforeEach(() => {
      move = new Axis1dAction('move', group, actionResetTypes.noReset);
      move2d = new Axis2dAction('move2d', group, actionResetTypes.noReset);

      inputManager.addAxis1dActions(move);
      inputManager.addAxis2dActions(move2d);

      source.axis1dBindings.add(
        new KeyboardAxis1dBinding(move, keyCodes.d, keyCodes.a),
      );
      source.axis2dBindings.add(
        new KeyboardAxis2dBinding(
          move2d,
          keyCodes.w,
          keyCodes.s,
          keyCodes.d,
          keyCodes.a,
        ),
      );
    });

    it('does not leave an axis stuck when its key is released while the group is inactive', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.d }));
      expect(move.value).toBe(1);
      expect(move2d.value.x).toBe(1);

      inputManager.setActiveGroup(menuGroup);
      expect(move.value).toBe(0);
      expect(move2d.value.x).toBe(0);

      window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));
      inputManager.setActiveGroup(group);

      expect(move.value).toBe(0);
      expect(move2d.value.x).toBe(0);
    });

    it('does not reverse an axis when its key is pressed while the group is inactive', () => {
      inputManager.setActiveGroup(menuGroup);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.d }));
      inputManager.setActiveGroup(group);

      // The key is still held, so the axis picks it up as soon as its group
      // becomes active.
      expect(move.value).toBe(1);
      expect(move2d.value.x).toBe(1);

      window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.d }));

      expect(move.value).toBe(0);
      expect(move2d.value.x).toBe(0);
    });

    it('keeps an axis whose key stays held across a switch away and back', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCodes.a }));

      inputManager.setActiveGroup(menuGroup);
      inputManager.setActiveGroup(group);

      expect(move.value).toBe(-1);
      expect(move2d.value.x).toBe(-1);

      window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCodes.a }));

      expect(move.value).toBe(0);
      expect(move2d.value.x).toBe(0);
    });

    it('ends a hold when its group is deactivated and starts it again if its key is still held', () => {
      inputManager.addHoldActions(keyHoldAction);

      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: keyCodes.space }),
      );
      expect(keyHoldAction.isHeld).toBe(true);

      inputManager.setActiveGroup(menuGroup);
      expect(keyHoldAction.isHeld).toBe(false);

      inputManager.setActiveGroup(group);
      expect(keyHoldAction.isHeld).toBe(true);

      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: keyCodes.space }),
      );
      expect(keyHoldAction.isHeld).toBe(false);
    });
  });
});
