import { Resettable, Stoppable, Updatable } from '../../common';
import { buttonMoments, KeyCode } from '../constants';
import { InputManager } from '../input-manager';
import {
  KeyboardHoldInteraction,
  KeyboardTriggerInteraction,
} from '../interactions';
import { InputSource } from './input-source';

export class KeyboardInputSource
  implements InputSource, Updatable, Stoppable, Resettable
{
  private readonly _inputManager: InputManager;

  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();
  private readonly _keyHolds = new Set<KeyCode>();

  constructor(inputManager: InputManager) {
    this._inputManager = inputManager;

    this._inputManager.addUpdatable(this);
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
    this._inputManager.removeUpdatable(this);
    this._inputManager.removeResettable(this);
  }

  public update(): void {
    for (const keyCode of this._keyHolds) {
      const interaction = new KeyboardHoldInteraction(
        {
          keyCode,
        },
        this,
      );

      this._inputManager.dispatchHoldAction(interaction);
    }
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesDown.add(keyCode);
    this._keyHolds.add(keyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.down,
        keyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPressesUps.add(keyCode);
    this._keyHolds.delete(keyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.up,
        keyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };
}
