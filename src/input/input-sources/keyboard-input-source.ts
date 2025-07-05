import { ButtonMoment, buttonMoments, KeyCode } from '../constants';
import { InputAction } from '../input-types';
import { ActionableInputSource } from './actionable-input-source';

interface BindArgs {
  keyCode: KeyCode;
  moment: ButtonMoment;
}

interface InputWithArgs<TInput, TArgs> {
  input: TInput;
  args: TArgs;
}

export class KeyboardInputSource implements ActionableInputSource<BindArgs> {
  private readonly _inputActions: Array<InputWithArgs<InputAction, BindArgs>>;
  private readonly _keyPresses = new Set<KeyCode>();
  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();

  constructor() {
    this._inputActions = Array<InputWithArgs<InputAction, BindArgs>>();

    window.addEventListener('keydown', this._onKeyDownHandler);
    window.addEventListener('keyup', this._onKeyUpHandler);
  }

  public bindAction(input: InputAction, args: BindArgs): void {
    const actionAlreadyBound = this._inputActions.find(
      (item) =>
        item.args.keyCode === args.keyCode &&
        item.args.moment === args.moment &&
        item.input.name === input.name,
    );

    if (actionAlreadyBound) {
      return;
    }

    this._inputActions.push({ input, args });
  }

  public reset(): void {
    this._keyPressesDown.clear();
    this._keyPressesUps.clear();
    this._keyPresses.clear();
  }

  public stop(): void {
    window.removeEventListener('keydown', this._onKeyDownHandler);
    window.removeEventListener('keyup', this._onKeyUpHandler);
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    this._keyPresses.add(event.code as KeyCode);
    this._keyPressesDown.add(event.code as KeyCode);

    for (const action of this._inputActions) {
      if (
        action.args.keyCode === (event.code as KeyCode) &&
        action.args.moment === buttonMoments.down
      ) {
        action.input.trigger();
      }
    }
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    this._keyPresses.delete(event.code as KeyCode);
    this._keyPressesUps.add(event.code as KeyCode);

    for (const action of this._inputActions) {
      if (
        action.args.keyCode === (event.code as KeyCode) &&
        action.args.moment === buttonMoments.up
      ) {
        action.input.trigger();
      }
    }
  };
}
