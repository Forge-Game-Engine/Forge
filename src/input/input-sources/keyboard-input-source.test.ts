import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInputSource } from './keyboard-input-source';
import { buttonMoments, keyCodes } from '../constants';
import { InputManager } from '../input-manager';

describe('KeyboardInputSource', () => {
  let inputManager: InputManager;
  let keyboardInputSource: KeyboardInputSource;

  beforeEach(() => {
    inputManager = {
      dispatchTriggerAction: vi.fn(),
      dispatchHoldAction: vi.fn(),    
    } as unknown as InputManager;
    keyboardInputSource = new KeyboardInputSource(inputManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should bind and trigger action on keydown', () => {
    const event = new window.KeyboardEvent('keydown', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(inputManager.dispatchTriggerAction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: {
          moment: buttonMoments.down,
          keyCode: keyCodes.space,
        },
        source: keyboardInputSource,
      }),
    );
  });

  it('should bind and trigger action on keyup', () => {
    const event = new window.KeyboardEvent('keyup', { code: keyCodes.space });
    window.dispatchEvent(event);

    expect(inputManager.dispatchTriggerAction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: {
          moment: buttonMoments.up,
          keyCode: keyCodes.space,
        },
        source: keyboardInputSource,
      }),
    );
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
