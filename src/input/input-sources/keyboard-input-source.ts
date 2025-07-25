import { buttonMoments, KeyCode } from '../constants';
import { ActionableInputSource } from './actionable-input-source';
import { InputManager } from '../input-manager';
import { KeyboardTriggerInteraction, KeyboardHoldInteraction } from '../interactions';

export class KeyboardInputSource implements ActionableInputSource {
  private readonly _inputManager: InputManager;

  private readonly _keyPresses = new Set<KeyCode>();
  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();
  private readonly _keyPressesHold = new Set<KeyCode>(); 

  constructor(inputManager: InputManager) {
    this._inputManager = inputManager;

    window.addEventListener('keydown', this._onKeyDownHandler);
    window.addEventListener('keyup', this._onKeyUpHandler);
    window.addEventListener('keydown', this._onKeyHoldHandler);
  }

  get name() {
    return 'keyboard';
  }

  public reset(): void {
    this._keyPressesDown.clear();
    this._keyPressesUps.clear();
    this._keyPressesHold.clear();
  }

  public stop(): void {
    window.removeEventListener('keydown', this._onKeyDownHandler);
    window.removeEventListener('keyup', this._onKeyUpHandler);
    window.removeEventListener('keydown', this._onKeyHoldHandler);
  }

  private readonly _onKeyHoldHandler = (event: KeyboardEvent) => {
   const keyCode = event.code as KeyCode;

    this._keyPresses.add(keyCode);
    this._keyPressesHold.add(keyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.hold,
        keyCode,
      },
      this,
    );

    this._inputManager.dispatchHoldAction(interaction);
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyPresses.add(keyCode);
    this._keyPressesDown.add(keyCode);

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

    this._keyPresses.delete(keyCode);
    this._keyPressesUps.add(keyCode);

    const interaction = new KeyboardTriggerInteraction(
      {
        moment: buttonMoments.up,
        keyCode,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
    this._inputManager.activeGroup?.dispatchHoldAction(interaction)
  };
}
