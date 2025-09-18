import { Resettable, Stoppable } from '../../../common';
import { KeyboardHoldBinding } from '../bindings/keyboard-hold-binding';
import { buttonMoments, KeyCode } from '../../constants';
import { InputManager } from '../../input-manager';
import {
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardTriggerBinding,
} from '../bindings';
import {
  Axis1dInputSource,
  Axis2dInputSource,
  HoldInputSource,
  TriggerInputSource,
} from '../../input-sources';

/** Represents a keyboard input source with associated bindings. */
export class KeyboardInputSource
  implements
    TriggerInputSource<KeyboardTriggerBinding>,
    HoldInputSource<KeyboardHoldBinding>,
    Axis2dInputSource<KeyboardAxis2dBinding>,
    Axis1dInputSource<KeyboardAxis1dBinding>,
    Stoppable,
    Resettable
{
  /** The set of trigger bindings associated with this input source. */
  public readonly triggerBindings = new Set<KeyboardTriggerBinding>();
  /** The set of hold bindings associated with this input source. */
  public readonly holdBindings = new Set<KeyboardHoldBinding>();
  /** The set of axis-2d bindings associated with this input source. */
  public readonly axis2dBindings = new Set<KeyboardAxis2dBinding>();
  /** The set of axis-1d bindings associated with this input source. */
  public readonly axis1dBindings = new Set<KeyboardAxis1dBinding>();
  public readonly name = 'Keyboard';

  private readonly _inputManager: InputManager;

  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();
  private readonly _keyHolds = new Set<KeyCode>();

  /** Constructs a new KeyboardInputSource.
   * @param inputManager - The input manager to associate with this input source.
   */
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

    this._handleTriggerBindingsOnKeyDown(keyCode);
    this._handleHoldBindingsOnKeyDown(keyCode);
    this._handleAxis1dBindingsOnKeyDown(keyCode);
    this._handleAxis2dBindingsOnKeyDown(keyCode);
  };

  private _handleTriggerBindingsOnKeyDown(keyCode: KeyCode): void {
    for (const binding of this.triggerBindings) {
      if (
        binding.keyCode === keyCode &&
        binding.moment === buttonMoments.down
      ) {
        this._inputManager.dispatchTriggerAction(binding);
      }
    }
  }

  private _handleHoldBindingsOnKeyDown(keyCode: KeyCode): void {
    for (const binding of this.holdBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.dispatchHoldStartAction(binding);
      }
    }
  }

  private _handleAxis1dBindingsOnKeyDown(keyCode: KeyCode): void {
    for (const binding of this.axis1dBindings) {
      let value = binding.action.value;

      if (binding.positiveKeyCode === keyCode) {
        value += 1;
      } else if (binding.negativeKeyCode === keyCode) {
        value -= 1;
      }

      this._inputManager.dispatchAxis1dAction(binding, value);
    }
  }

  private _handleAxis2dBindingsOnKeyDown(keyCode: KeyCode): void {
    for (const binding of this.axis2dBindings) {
      let x = binding.action.value.x;
      let y = binding.action.value.y;

      if (binding.northKeyCode === keyCode) {
        y += 1;
      } else if (binding.southKeyCode === keyCode) {
        y -= 1;
      }

      if (binding.eastKeyCode === keyCode) {
        x += 1;
      } else if (binding.westKeyCode === keyCode) {
        x -= 1;
      }

      this._inputManager.dispatchAxis2dAction(binding, x, y);
    }
  }

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesUps.add(keyCode);
    this._keyHolds.delete(keyCode);

    this._handleTriggerBindingsOnKeyUp(keyCode);
    this._handleHoldBindingsOnKeyUp(keyCode);
    this._handleAxis1dBindingsOnKeyUp(keyCode);
    this._handleAxis2dBindingsOnKeyUp(keyCode);
  };

  private _handleTriggerBindingsOnKeyUp(keyCode: KeyCode): void {
    for (const binding of this.triggerBindings) {
      if (binding.keyCode === keyCode && binding.moment === buttonMoments.up) {
        this._inputManager.dispatchTriggerAction(binding);
      }
    }
  }

  private _handleHoldBindingsOnKeyUp(keyCode: KeyCode): void {
    for (const binding of this.holdBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.dispatchHoldEndAction(binding);
      }
    }
  }

  private _handleAxis1dBindingsOnKeyUp(keyCode: KeyCode): void {
    for (const binding of this.axis1dBindings) {
      let value = binding.action.value;

      if (binding.positiveKeyCode === keyCode) {
        value -= 1;
      } else if (binding.negativeKeyCode === keyCode) {
        value += 1;
      }

      this._inputManager.dispatchAxis1dAction(binding, value);
    }
  }

  private _handleAxis2dBindingsOnKeyUp(keyCode: KeyCode): void {
    for (const binding of this.axis2dBindings) {
      let x = binding.action.value.x;
      let y = binding.action.value.y;

      if (binding.northKeyCode === keyCode) {
        y -= 1;
      } else if (binding.southKeyCode === keyCode) {
        y += 1;
      }

      if (binding.eastKeyCode === keyCode) {
        x -= 1;
      } else if (binding.westKeyCode === keyCode) {
        x += 1;
      }

      this._inputManager.dispatchAxis2dAction(binding, x, y);
    }
  }
}
