import { Game } from '../../ecs';
import { Vector2 } from '../../math';
import { axisMeasurements, buttonMoments, MouseButton } from '../constants';
import { ActionableInputSource } from './actionable-input-source';
import { InputManager } from '../input-manager';
import { MouseAxis1dBinding, MouseTriggerBinding } from '../bindings';

export class MouseInputSource implements ActionableInputSource {
  private readonly _inputManager: InputManager;
  private readonly _game: Game;
  private readonly _containerBoundingClientRect: DOMRect;

  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();

  private readonly _lastMousePosition = Vector2.zero;
  private _scrollDelta = 0;

  constructor(inputManager: InputManager, game: Game) {
    this._inputManager = inputManager;
    this._game = game;
    this._containerBoundingClientRect = game.container.getBoundingClientRect();

    game.container.addEventListener('mousedown', this._onMouseDownHandler);
    game.container.addEventListener('mouseup', this._onMouseUpHandler);
    game.container.addEventListener('wheel', this._onWheelHandler);
    game.container.addEventListener('mousemove', this._onMouseMoveHandler);
  }

  get name() {
    return 'mouse';
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
    const button = event.button as MouseButton;

    this._mouseButtonPresses.add(button);
    this._mouseButtonDowns.add(button);

    const binding = new MouseTriggerBinding(
      {
        moment: buttonMoments.down,
        mouseButton: button,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(binding);
  };

  private readonly _onMouseUpHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.delete(button);
    this._mouseButtonUps.add(button);

    const binding = new MouseTriggerBinding(
      {
        moment: buttonMoments.up,
        mouseButton: button,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(binding);
  };

  private readonly _onWheelHandler = (event: WheelEvent) => {
    this._scrollDelta = event.deltaY;

    const binding = new MouseAxis1dBinding(this);

    this._inputManager.dispatchAxis1dAction(binding, event.deltaY);
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
