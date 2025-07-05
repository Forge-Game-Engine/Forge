import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInputSource } from './keyboard-input-source';
import { buttonMoments, KeyCode, keyCodes } from '../constants';
import { InputAction } from '../input-types';

describe('KeyboardInputSource', () => {
  let keyboardInputSource: KeyboardInputSource;

  beforeEach(() => {
    keyboardInputSource = new KeyboardInputSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should bind and trigger action on keydown', () => {
    const action = new InputAction('fire');

    keyboardInputSource.bindAction(action, {
      keyCode: keyCodes.space,
      moment: buttonMoments.down,
    });

    const event = new window.KeyboardEvent('keydown', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(action.fired).toBe(true);
  });

  it('should bind and trigger action on keyup', () => {
    const action = new InputAction('fire');

    keyboardInputSource.bindAction(action, {
      keyCode: keyCodes.space,
      moment: buttonMoments.up,
    });

    const event = new window.KeyboardEvent('keyup', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(action.fired).toBe(true);
  });

  it('should not trigger action if keyCode does not match', () => {
    const action = new InputAction('fire');

    keyboardInputSource.bindAction(action, {
      keyCode: keyCodes.f,
      moment: buttonMoments.down,
    });

    const event = new window.KeyboardEvent('keydown', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(action.fired).toBe(false);
  });

  it('should update existing action if binding with same keyCode and moment', () => {
    const action1 = new InputAction('fire');
    const action2 = new InputAction('jump');

    keyboardInputSource.bindAction(action1, {
      keyCode: keyCodes.space,
      moment: buttonMoments.down,
    });
    keyboardInputSource.bindAction(action2, {
      keyCode: keyCodes.space,
      moment: buttonMoments.down,
    });

    const event = new window.KeyboardEvent('keydown', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(action1.fired).toBe(true);
    expect(action2.fired).toBe(true);
  });

  it('should clear key presses and reset actions on reset()', () => {
    const action = new MockInputAction();
    keyboardInputSource.bindAction(action, {
      keyCode: 'KeyF' as KeyCode,
      moment: buttonMoments.down,
    });

    // Simulate keydown to fill sets
    const event = new window.KeyboardEvent('keydown', { code: 'KeyF' });
    window.dispatchEvent(event);

    keyboardInputSource.reset();

    expect(action.resetCalled).toBe(true);
    // _keyPresses, _keyPressesDown, _keyPressesUps are private, so we can't check directly
    // But we can check that after reset, triggering again works as expected
    action.triggered = false;
    window.dispatchEvent(event);
    expect(action.triggered).toBe(true);
  });

  it('should remove event listeners on stop()', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    keyboardInputSource.stop();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function),
    );
  });
});
