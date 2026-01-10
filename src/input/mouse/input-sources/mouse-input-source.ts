import { Vector2 } from '../../../math/index.js';
import {
  buttonMoments,
  cursorValueTypes,
  MouseButton,
} from '../../constants/index.js';
import { InputManager } from '../../input-manager.js';
import { Resettable, Stoppable } from '../../../common/index.js';
import {
  MouseAxis1dBinding,
  MouseAxis2dBinding,
  MouseHoldBinding,
  MouseTriggerBinding,
} from '../bindings/index.js';
import {
  Axis1dInputSource,
  Axis2dInputSource,
  HoldInputSource,
  TriggerInputSource,
} from '../../input-sources/index.js';

/** Represents a mouse input source with associated bindings. */
export class MouseInputSource
  implements
    TriggerInputSource<MouseTriggerBinding>,
    HoldInputSource<MouseHoldBinding>,
    Axis1dInputSource<MouseAxis1dBinding>,
    Axis2dInputSource<MouseAxis2dBinding>,
    Resettable,
    Stoppable
{
  /** The name of this input source. */
  public readonly name = 'mouse';
  /** The set of trigger bindings associated with this input source. */
  public readonly triggerBindings = new Set<MouseTriggerBinding>();
  /** The set of 1D axis bindings associated with this input source. */
  public readonly axis1dBindings = new Set<MouseAxis1dBinding>();
  /** The set of 2D axis bindings associated with this input source. */
  public readonly axis2dBindings = new Set<MouseAxis2dBinding>();
  /** The set of hold bindings associated with this input source. */
  public readonly holdBindings = new Set<MouseHoldBinding>();

  private readonly _inputManager: InputManager;
  private readonly _container: HTMLElement;
  private readonly _containerBoundingClientRect: DOMRect;

  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();
  private readonly _mouseButtonHolds = new Set<MouseButton>();

  private readonly _lastMousePosition = Vector2.zero;

  /** Constructs a new MouseInputSource.
   * @param inputManager - The input manager to register with.
   * @param container - The HTML container element to attach mouse events to.
   */
  constructor(inputManager: InputManager, container: HTMLElement) {
    this._inputManager = inputManager;
    this._container = container;
    this._containerBoundingClientRect = container.getBoundingClientRect();

    container.addEventListener('mousedown', this._onMouseDownHandler);
    container.addEventListener('mouseup', this._onMouseUpHandler);
    container.addEventListener('wheel', this._onWheelHandler);
    container.addEventListener('mousemove', this._onMouseMoveHandler);

    this._inputManager.addResettable(this);

    this.triggerBindings = new Set();
    this.holdBindings = new Set();
    this.axis1dBindings = new Set();
    this.axis2dBindings = new Set();
  }

  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._mouseButtonPresses.clear();
    this._mouseButtonHolds.clear();
  }

  public stop(): void {
    this._container.removeEventListener('mousedown', this._onMouseDownHandler);
    this._container.removeEventListener('mouseup', this._onMouseUpHandler);
    this._container.removeEventListener('wheel', this._onWheelHandler);
    this._container.removeEventListener('mousemove', this._onMouseMoveHandler);
    this._inputManager.removeResettable(this);
  }

  private readonly _onMouseDownHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.add(button);
    this._mouseButtonDowns.add(button);

    for (const binding of this.triggerBindings) {
      if (
        binding.mouseButton === button &&
        binding.moment === buttonMoments.down
      ) {
        binding.action.trigger();
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.mouseButton === button) {
        this._mouseButtonHolds.add(button);
        this._inputManager.dispatchHoldStartAction(binding);
      }
    }
  };

  private readonly _onMouseUpHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.delete(button);
    this._mouseButtonUps.add(button);

    for (const binding of this.triggerBindings) {
      if (
        binding.mouseButton === button &&
        binding.moment === buttonMoments.up
      ) {
        binding.action.trigger();
      }
    }

    for (const binding of this.holdBindings) {
      if (binding.mouseButton === button) {
        this._mouseButtonHolds.delete(button);
        this._inputManager.dispatchHoldEndAction(binding);
      }
    }
  };

  private readonly _onWheelHandler = (event: WheelEvent) => {
    for (const binding of this.axis1dBindings) {
      binding.action.set(event.deltaY / 100);
    }
  };

  private readonly _onMouseMoveHandler = (event: MouseEvent) => {
    const x = event.clientX - this._containerBoundingClientRect.left;
    const y = event.clientY - this._containerBoundingClientRect.top;

    const normalizedX = x / this._containerBoundingClientRect.width;
    const normalizedY = y / this._containerBoundingClientRect.height;

    for (const binding of this.axis2dBindings) {
      const { cursorValueType } = binding;

      const absoluteXOffset =
        binding.cursorOrigin.x * this._containerBoundingClientRect.width;
      const absoluteYOffset =
        binding.cursorOrigin.y * this._containerBoundingClientRect.height;

      if (cursorValueType === cursorValueTypes.absolute) {
        binding.action.set(x - absoluteXOffset, y - absoluteYOffset);
      } else if (cursorValueType === cursorValueTypes.ratio) {
        binding.action.set(
          normalizedX - binding.cursorOrigin.x,
          normalizedY - binding.cursorOrigin.y,
        );
      } else {
        throw new Error(
          `Unsupported cursor value type: ${cursorValueType as string}`,
        );
      }
    }

    this._lastMousePosition.x = x;
    this._lastMousePosition.y = y;
  };
}
