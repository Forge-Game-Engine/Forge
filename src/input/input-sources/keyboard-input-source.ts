import { ButtonMoment, buttonMoments, KeyCode } from '../constants';
import { ActionableInputSource } from './actionable-input-source';
import { InputManager } from '../input-manager';
import { InputBinding } from '../input-binding';
import { TriggerAction } from '../actions';

interface KeyboardBindArgs {
  moment: ButtonMoment;
  keyCode: KeyCode;
}

export class KeyboardTriggerActionInputBinding extends InputBinding<
  TriggerAction,
  KeyboardBindArgs
> {
  constructor(
    action: TriggerAction,
    args: KeyboardBindArgs,
    source: KeyboardInputSource,
  ) {
    super(action, args, source);
  }

  public override matchesArgs(args: KeyboardBindArgs): boolean {
    return (
      this.args.moment === args.moment && this.args.keyCode === args.keyCode
    );
  }

  override get displayText(): string {
    return `On "${this.args.keyCode}" ${this.args.moment}`;
  }
}

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
    this._keyPresses.add(event.code as KeyCode);
    this._keyPressesDown.add(event.code as KeyCode);

    const args = {
      moment: buttonMoments.down,
      keyCode: event.code as KeyCode,
    };

    this._inputManager.dispatchTriggerAction(this, args);
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    this._keyPresses.delete(event.code as KeyCode);
    this._keyPressesUps.add(event.code as KeyCode);

    const args = {
      moment: buttonMoments.up,
      keyCode: event.code as KeyCode,
    };

    this._inputManager.dispatchTriggerAction(this, args);
  };
}
