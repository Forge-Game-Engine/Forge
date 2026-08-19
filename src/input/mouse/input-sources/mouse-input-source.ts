import { Vec2, Vector2 } from '../../../math/index.js';
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

  private readonly _mouseButtonPresses = new Set<MouseButton>();
  private readonly _mouseButtonDowns = new Set<MouseButton>();
  private readonly _mouseButtonUps = new Set<MouseButton>();
  private readonly _mouseButtonHolds = new Set<MouseButton>();

  private readonly _pointerPosition = Vec2.zero;
  private readonly _pointerDelta = Vec2.zero;
  private _pointerScroll = 0;

  /** Constructs a new MouseInputSource.
   * @param inputManager - The input manager to register with.
   * @param container - The HTML container element to attach mouse events to.
   */
  constructor(inputManager: InputManager, container: HTMLElement) {
    this._inputManager = inputManager;
    this._container = container;

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

  /**
   * The pointer's current position in canvas pixels: Y-down, origin at the
   * container's top-left corner. Recomputed from a fresh
   * `getBoundingClientRect()` call on every `mousemove`, so it stays correct
   * after the container is resized, scrolled, or otherwise reflowed.
   */
  get position(): Vector2 {
    return this._pointerPosition;
  }

  /** How far `position` moved since the last `reset()`, in canvas pixels. */
  get delta(): Vector2 {
    return this._pointerDelta;
  }

  /**
   * Accumulated wheel scroll delta (`WheelEvent.deltaY`) since the last
   * `reset()`.
   */
  get scroll(): number {
    return this._pointerScroll;
  }

  /** Buttons that started being held down since the last `reset()`. */
  get buttonsDown(): ReadonlySet<MouseButton> {
    return this._mouseButtonDowns;
  }

  /** Buttons currently held down. */
  get buttonsHeld(): ReadonlySet<MouseButton> {
    return this._mouseButtonPresses;
  }

  /** Buttons that stopped being held down since the last `reset()`. */
  get buttonsUp(): ReadonlySet<MouseButton> {
    return this._mouseButtonUps;
  }

  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._mouseButtonHolds.clear();

    this._pointerDelta.x = 0;
    this._pointerDelta.y = 0;
    this._pointerScroll = 0;
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
        this._inputManager.dispatchTriggerAction(binding);
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
        this._inputManager.dispatchTriggerAction(binding);
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
    this._pointerScroll += event.deltaY;

    for (const binding of this.axis1dBindings) {
      binding.action.set(event.deltaY / 100);
    }
  };

  private readonly _onMouseMoveHandler = (event: MouseEvent) => {
    const containerBoundingClientRect = this._container.getBoundingClientRect();

    const x = event.clientX - containerBoundingClientRect.left;
    const y = event.clientY - containerBoundingClientRect.top;

    const normalizedX = x / containerBoundingClientRect.width;
    const normalizedY = y / containerBoundingClientRect.height;

    for (const binding of this.axis2dBindings) {
      const { cursorValueType } = binding;

      const absoluteXOffset =
        binding.cursorOrigin.x * containerBoundingClientRect.width;
      const absoluteYOffset =
        binding.cursorOrigin.y * containerBoundingClientRect.height;

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

    this._pointerDelta.x += event.movementX;
    this._pointerDelta.y += event.movementY;

    this._pointerPosition.x = x;
    this._pointerPosition.y = y;
  };
}
