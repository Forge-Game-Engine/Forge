import { Game } from '../../ecs';
import { Vector2 } from '../../math';
import { buttonMoments, MouseButton } from '../constants';
import { InputManager } from '../input-manager';
import {
  MouseAxis1dInteraction,
  MouseAxis2dInteraction,
  MouseTriggerInteraction,
} from '../interactions';
import { InputSource } from './input-source';
import { Resettable, Stoppable } from '../../common';

export class MouseInputSource implements InputSource, Resettable, Stoppable {
  private readonly _inputManager: InputManager;
  private readonly _game: Game;
  private readonly _containerBoundingClientRect: DOMRect;

  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();

  private readonly _lastMousePosition = Vector2.zero;

  constructor(inputManager: InputManager, game: Game) {
    this._inputManager = inputManager;
    this._game = game;
    this._containerBoundingClientRect = game.container.getBoundingClientRect();

    game.container.addEventListener('mousedown', this._onMouseDownHandler);
    game.container.addEventListener('mouseup', this._onMouseUpHandler);
    game.container.addEventListener('wheel', this._onWheelHandler);
    game.container.addEventListener('mousemove', this._onMouseMoveHandler);

    this._inputManager.addResettable(this);
  }

  get name() {
    return 'mouse';
  }

  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._mouseButtonPresses.clear();
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
    this._inputManager.removeResettable(this);
  }

  private readonly _onMouseDownHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.add(button);
    this._mouseButtonDowns.add(button);

    const interaction = new MouseTriggerInteraction(
      {
        moment: buttonMoments.down,
        mouseButton: button,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };

  private readonly _onMouseUpHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.delete(button);
    this._mouseButtonUps.add(button);

    const interaction = new MouseTriggerInteraction(
      {
        moment: buttonMoments.up,
        mouseButton: button,
      },
      this,
    );

    this._inputManager.dispatchTriggerAction(interaction);
  };

  private readonly _onWheelHandler = (event: WheelEvent) => {
    const interaction = new MouseAxis1dInteraction(this);

    this._inputManager.dispatchAxis1dAction(interaction, event.deltaY / 100);
  };

  private readonly _onMouseMoveHandler = (event: MouseEvent) => {
    const x = event.clientX - this._containerBoundingClientRect.left;
    const y = event.clientY - this._containerBoundingClientRect.top;

    const interaction = new MouseAxis2dInteraction(this);

    this._inputManager.dispatchAxis2dAction(interaction, new Vector2(x, y));

    this._lastMousePosition.x = x;
    this._lastMousePosition.y = y;
  };
}
