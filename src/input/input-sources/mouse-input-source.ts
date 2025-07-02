import { MouseButton } from '../constants';
import { InputAction, InputAxis1d } from '../input-types';
import { ActionableInputSource } from './actionable-input-source';
import { Axis1dInputSource } from './axis-1d-input-source';

interface ActionBindArgs {
  mouseButton: MouseButton;
  moment: 'down' | 'up';
}

interface InputWithArgs<TInput, TArgs> {
  input: TInput;
  args: TArgs;
}

export class MouseInputSource
  implements ActionableInputSource<ActionBindArgs>, Axis1dInputSource
{
  private readonly _inputActions: Array<
    InputWithArgs<InputAction, ActionBindArgs>
  >;
  private readonly _inputAxis1d: Array<InputAxis1d>;
  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();

  private _scrollDelta = 0;

  constructor() {
    this._inputActions = Array<InputWithArgs<InputAction, ActionBindArgs>>();
    this._inputAxis1d = Array<InputAxis1d>();

    window.addEventListener('mousedown', this._onMouseDownHandler);
    window.addEventListener('mouseup', this._onMouseUpHandler);
    window.addEventListener('wheel', this._onWheelHandler);
  }

  public bindAxis1d(inputAxis: InputAxis1d): void {
    if (this._inputAxis1d.includes(inputAxis)) {
      return;
    }

    this._inputAxis1d.push(inputAxis);
  }

  public bindAction(input: InputAction, args: ActionBindArgs): void {
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
    this._scrollDelta = 0;

    for (const action of this._inputActions) {
      action.input.reset();
    }

    for (const inputAxis of this._inputAxis1d) {
      inputAxis.reset();
    }
  }

  public stop(): void {
    window.removeEventListener('mousedown', this._onMouseDownHandler);
    window.removeEventListener('mouseup', this._onMouseUpHandler);
    window.removeEventListener('wheel', this._onWheelHandler);
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

  private readonly _onWheelHandler = (event: WheelEvent) => {
    this._scrollDelta = event.deltaY;

    for (const inputAxis of this._inputAxis1d) {
      inputAxis.set(this._scrollDelta);
    }
  };
}
