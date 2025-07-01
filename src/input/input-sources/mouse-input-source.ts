import { MouseButton } from '../constants';
import { InputAction } from '../input-types';
import { ActionableInputSource } from './actionable-input-source';

interface BindArgs {
  mouseButton: MouseButton;
  moment: 'down' | 'up';
}

interface InputWithArgs<TInput, TArgs> {
  input: TInput;
  args: TArgs;
}

export class MouseInputSource implements ActionableInputSource<BindArgs> {
  private readonly _inputActions: Array<InputWithArgs<InputAction, BindArgs>>;
  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();

  constructor() {
    this._inputActions = Array<InputWithArgs<InputAction, BindArgs>>();

    window.addEventListener('mousedown', this._onMouseDownHandler);
    window.addEventListener('mouseup', this._onMouseUpHandler);
  }

  public bindAction(input: InputAction, args: BindArgs): void {
    const existingAction = this._inputActions.find(
      (item) =>
        item.args.mouseButton === args.mouseButton &&
        item.args.moment === args.moment,
    );

    if (existingAction) {
      existingAction.input = input;
      existingAction.args = args;

      return;
    }

    this._inputActions.push({ input, args });
  }

  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._mouseButtonPresses.clear();
  }

  public stop(): void {
    window.removeEventListener('mousedown', this._onMouseDownHandler);
    window.removeEventListener('mouseup', this._onMouseUpHandler);
  }

  private readonly _onMouseDownHandler = (event: MouseEvent) => {
    this._mouseButtonPresses.add(event.button as MouseButton);
    this._mouseButtonDowns.add(event.button as MouseButton);

    for (const action of this._inputActions) {
      if (
        action.args.mouseButton === (event.button as MouseButton) &&
        action.args.moment === 'down'
      ) {
        action.input.trigger();
      }
    }
  };

  private readonly _onMouseUpHandler = (event: MouseEvent) => {
    this._mouseButtonPresses.delete(event.button as MouseButton);
    this._mouseButtonUps.add(event.button as MouseButton);

    for (const action of this._inputActions) {
      if (
        action.args.mouseButton === (event.button as MouseButton) &&
        action.args.moment === 'up'
      ) {
        action.input.trigger();
      }
    }
  };
}
