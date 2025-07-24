import { buttonMoments, KeyCode } from '../constants';
import { ActionableInputSource } from './actionable-input-source';
import { InputManager } from '../input-manager';
import { KeyboardTriggerInteraction } from '../interactions';

export class KeyboardInputSource implements ActionableInputSource {
  private readonly _inputManager: InputManager;

  private readonly _keyPresses = new Set<KeyCode>();
  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();

  constructor(inputManager: InputManager) {
    this._inputManager = inputManager;

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
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    this._keyPresses.add(event.code as KeyCode);
    this._keyPressesDown.add(event.code as KeyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.down,
        keyCode: event.code as KeyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    this._keyPresses.delete(event.code as KeyCode);
    this._keyPressesUps.add(event.code as KeyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.up,
        keyCode: event.code as KeyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };
}
