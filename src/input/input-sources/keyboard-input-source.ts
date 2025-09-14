import { Resettable, Stoppable } from '../../common';
import { KeyboardTriggerBinding } from '../bindings';
import { KeyboardHoldBinding } from '../bindings/keyboard-hold-binding';
import { buttonMoments, KeyCode } from '../constants';
import { InputManager } from '../input-manager';
import { HoldBindableInputSource } from './hold-bindable-input-source';
import { TriggerBindableInputSource } from './trigger-bindable-input-source';

export class KeyboardInputSource
  implements
    TriggerBindableInputSource<KeyboardTriggerBinding>,
    HoldBindableInputSource<KeyboardHoldBinding>,
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
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesUps.add(keyCode);
    this._keyHolds.delete(keyCode);

    for (const binding of this.triggerBindings) {
      if (
        binding.action.inputGroup === this._inputManager.activeGroup &&
        binding.keyCode === keyCode &&
        binding.moment === buttonMoments.up
      ) {
        binding.action.trigger();
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.dispatchHoldEndAction(binding);
      }
    }
  };
}
