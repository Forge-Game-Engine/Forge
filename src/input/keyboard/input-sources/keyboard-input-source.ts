import { Resettable, Stoppable } from '../../../common';
import { KeyboardHoldBinding } from '../bindings/keyboard-hold-binding';
import { buttonMoments, KeyCode } from '../../constants';
import { InputManager } from '../../input-manager';
import { KeyboardTriggerBinding } from '../bindings';
import { HoldInputSource, TriggerInputSource } from '../../input-sources';

export class KeyboardInputSource
  implements
    TriggerInputSource<KeyboardTriggerBinding>,
    HoldInputSource<KeyboardHoldBinding>,
    Stoppable,
    Resettable
{
  public readonly triggerBindings = new Set<KeyboardTriggerBinding>();
  public readonly holdBindings = new Set<KeyboardHoldBinding>();
  public readonly name = 'Keyboard';

  private readonly _inputManager: InputManager;

  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();
  private readonly _keyHolds = new Set<KeyCode>();

  constructor(inputManager: InputManager) {
    this._inputManager = inputManager;

    this._inputManager.addResettable(this);

    window.addEventListener('keydown', this._onKeyDownHandler);
    window.addEventListener('keyup', this._onKeyUpHandler);
  }

  public reset(): void {
    this._keyPressesDown.clear();
    this._keyPressesUps.clear();
  }

  public stop(): void {
    window.removeEventListener('keydown', this._onKeyDownHandler);
    window.removeEventListener('keyup', this._onKeyUpHandler);
    this._inputManager.removeResettable(this);
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesDown.add(keyCode);
    this._keyHolds.add(keyCode);

    for (const binding of this.triggerBindings) {
      if (
        binding.keyCode === keyCode &&
        binding.moment === buttonMoments.down
      ) {
        this._inputManager.dispatchTriggerAction(binding);
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.dispatchHoldStartAction(binding);
      }
    }
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesUps.add(keyCode);
    this._keyHolds.delete(keyCode);

    for (const binding of this.triggerBindings) {
      if (binding.keyCode === keyCode && binding.moment === buttonMoments.up) {
        this._inputManager.dispatchTriggerAction(binding);
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.dispatchHoldEndAction(binding);
      }
    }
  };
}
