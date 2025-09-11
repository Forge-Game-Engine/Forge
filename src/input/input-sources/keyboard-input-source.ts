import { Resettable, Stoppable } from '../../common';
import { buttonMoments, KeyCode } from '../constants';
import { InputManager } from '../input-manager';
import {
  KeyboardAxis1dInteraction,
  KeyboardHoldInteraction,
  KeyboardTriggerInteraction,
} from '../interactions';
import { InputSource } from './input-source';

export class KeyboardInputSource implements InputSource, Stoppable, Resettable {
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

  get name() {
    return 'keyboard';
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

    const triggerInteraction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.down,
        keyCode,
      },
      this,
    );

    const holdInteraction = new KeyboardHoldInteraction(
      {
        keyCode,
      },
      this,
    );

    const negativeAxis1dInteraction = new KeyboardAxis1dInteraction(
      {
        negativeKey: keyCode,
      },
      this,
    );

    const positiveAxis1dInteraction = new KeyboardAxis1dInteraction(
      {
        positiveKey: keyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(triggerInteraction);
    this._inputManager.dispatchHoldStartAction(holdInteraction);
    this._inputManager.dispatchAxis1dAction(negativeAxis1dInteraction, -1);
    this._inputManager.dispatchAxis1dAction(positiveAxis1dInteraction, 1);
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesUps.add(keyCode);
    this._keyHolds.delete(keyCode);

    const triggerInteraction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.up,
        keyCode,
      },
      this,
    );

    const holdInteraction = new KeyboardHoldInteraction(
      {
        keyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(triggerInteraction);
    this._inputManager.dispatchHoldEndAction(holdInteraction);
  };
}
