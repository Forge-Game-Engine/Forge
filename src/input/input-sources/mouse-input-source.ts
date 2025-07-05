import { Game } from '../../ecs';
import { Vector2 } from '../../math';
import {
  AxisMeasurement,
  axisMeasurements,
  ButtonMoment,
  buttonMoments,
  getMouseButtonName,
  MouseButton,
} from '../constants';
import { InputAction, InputAxis1d, InputAxis2d } from '../input-types';
import { ActionableInputSource } from './actionable-input-source';
import { Axis1dInputSource } from './axis-1d-input-source';
import { Axis2dInputSource } from './axis-2d-input-source';

interface ActionBindArgs {
  mouseButton: MouseButton;
  moment: ButtonMoment;
}

interface Input2dBindArgs {
  type: AxisMeasurement;
}

interface InputWithArgs<TInput, TArgs> {
  input: TInput;
  args: TArgs;
}

export class MouseInputSource
  implements
    ActionableInputSource<ActionBindArgs>,
    Axis1dInputSource,
    Axis2dInputSource<Input2dBindArgs>
{
  private readonly _inputActions: Array<
    InputWithArgs<InputAction, ActionBindArgs>
  >;
  private readonly _inputAxis1d: Array<InputAxis1d>;
  private readonly _inputAxis2d: Array<
    InputWithArgs<InputAxis2d, Input2dBindArgs>
  >;

  private readonly _game: Game;
  private readonly _containerBoundingClientRect: DOMRect;

  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();

  private readonly _lastMousePosition = Vector2.zero;
  private _scrollDelta = 0;

  constructor(game: Game) {
    this._inputActions = Array<InputWithArgs<InputAction, ActionBindArgs>>();
    this._inputAxis1d = Array<InputAxis1d>();
    this._inputAxis2d = Array<InputWithArgs<InputAxis2d, Input2dBindArgs>>();

    this._game = game;
    this._containerBoundingClientRect = game.container.getBoundingClientRect();

    game.container.addEventListener('mousedown', this._onMouseDownHandler);
    game.container.addEventListener('mouseup', this._onMouseUpHandler);
    game.container.addEventListener('wheel', this._onWheelHandler);
    game.container.addEventListener('mousemove', this._onMouseMoveHandler);
  }

  public bindAction(input: InputAction, args: ActionBindArgs): void {
    const existingAction = this._inputActions.find(
      (item) => item.input === input,
    );

    if (existingAction) {
      existingAction.input = input;
      existingAction.args = args;
    } else {
      this._inputActions.push({ input, args });
    }

    const mouseButtonName = getMouseButtonName(args.mouseButton) ?? 'unknown';
    const control = `${mouseButtonName} button ${args.moment}`; // e.g., "left button down"

    input.bindSource({
      source: 'mouse',
      displayText: control,
    });
  }

  public bindAxis1d(input: InputAxis1d): void {
    const existingAxis1d = this._inputAxis1d.find(
      (item) => item.name === input.name,
    );

    if (existingAxis1d) {
      return;
    }

    this._inputAxis1d.push(input);
  }

  public bindAxis2d(input: InputAxis2d, args: Input2dBindArgs): void {
    const existingAxis2d = this._inputAxis2d.find(
      (item) => item.args.type === args.type && item.input.name === input.name,
    );

    if (existingAxis2d) {
      return;
    }

    this._inputAxis2d.push({ input, args });
  }

  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._mouseButtonPresses.clear();
    this._scrollDelta = 0;
  }

  public stop(): void {
    this._game.container.removeEventListener(
      'mousedown',
      this._onMouseDownHandler,
    );
    this._game.container.removeEventListener('mouseup', this._onMouseUpHandler);
    this._game.container.removeEventListener('wheel', this._onWheelHandler);
    this._game.container.removeEventListener(
      'mousemove',
      this._onMouseMoveHandler,
    );
  }

  private readonly _onMouseDownHandler = (event: MouseEvent) => {
    this._mouseButtonPresses.add(event.button as MouseButton);
    this._mouseButtonDowns.add(event.button as MouseButton);

    for (const action of this._inputActions) {
      if (
        action.args.mouseButton === (event.button as MouseButton) &&
        action.args.moment === buttonMoments.down
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
        action.args.moment === buttonMoments.up
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

  private readonly _onMouseMoveHandler = (event: MouseEvent) => {
    const x = event.clientX - this._containerBoundingClientRect.left;
    const y = event.clientY - this._containerBoundingClientRect.top;

    for (const inputAxis of this._inputAxis2d) {
      if (inputAxis.args.type === axisMeasurements.absolute) {
        inputAxis.input.set(x, y);

        continue;
      }

      if (inputAxis.args.type === axisMeasurements.delta) {
        const deltaX = x - this._lastMousePosition.x;
        const deltaY = y - this._lastMousePosition.y;

        inputAxis.input.set(deltaX, deltaY);
      }
    }

    this._lastMousePosition.x = x;
    this._lastMousePosition.y = y;
  };
}
