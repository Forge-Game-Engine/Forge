import { Vec2, Vector2 } from '../../../math/index.js';
import { Axis1dAction, HoldAction } from '../../actions/index.js';
import { cursorValueTypes, MouseButton } from '../../constants/index.js';
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

  private readonly _pointerPosition = Vec2.zero;
  private readonly _pointerDelta = Vec2.zero;
  private _pointerScroll = 0;
  private _wheelInput = 0;

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
   * The pointer's current position in CSS pixels: Y-down, origin at the
   * container's top-left corner. On a high-DPI display this is smaller than
   * the canvas's drawing-buffer coordinates by `RenderContext.pixelRatio`,
   * so convert it to world space against `RenderContext.cssWidth`/
   * `cssHeight`, not `width`/`height`. Recomputed from a fresh
   * `getBoundingClientRect()` call on every `mousemove`, so it stays correct
   * after the container is resized, scrolled, or otherwise reflowed.
   */
  get position(): Vector2 {
    return this._pointerPosition;
  }

  /** How far `position` moved since the last `reset()`, in CSS pixels. */
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

  /**
   * Ends the frame: clears the per-frame button sets, `delta` and `scroll`,
   * and withdraws the frame's wheel input from the wheel-bound actions,
   * since a wheel turn only describes the frame it happened in.
   */
  public reset(): void {
    this._mouseButtonDowns.clear();
    this._mouseButtonUps.clear();
    this._pointerDelta.x = 0;
    this._pointerDelta.y = 0;
    this._pointerScroll = 0;

    if (this._wheelInput !== 0) {
      this._wheelInput = 0;
      this._reportWheel();
    }
  }

  /** Stops listening to the mouse and releases everything this source was holding. */
  public stop(): void {
    this._container.removeEventListener('mousedown', this._onMouseDownHandler);
    this._container.removeEventListener('mouseup', this._onMouseUpHandler);
    this._container.removeEventListener('wheel', this._onWheelHandler);
    this._container.removeEventListener('mousemove', this._onMouseMoveHandler);
    this._inputManager.removeResettable(this);
    this._mouseButtonPresses.clear();
    this._wheelInput = 0;
    this._inputManager.removeSourceInput(this);
  }

  private readonly _onMouseDownHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.add(button);
    this._mouseButtonDowns.add(button);
    this._reportButton(button, true);
  };

  private readonly _onMouseUpHandler = (event: MouseEvent) => {
    const button = event.button as MouseButton;

    this._mouseButtonPresses.delete(button);
    this._mouseButtonUps.add(button);
    this._reportButton(button, false);
  };

  private readonly _onWheelHandler = (event: WheelEvent) => {
    this._pointerScroll += event.deltaY;
    // Every wheel event in a frame adds up, and `reset` withdraws the total
    // at the end of the frame.
    this._wheelInput += event.deltaY / 100;
    this._reportWheel();
  };

  private _reportButton(button: MouseButton, isDown: boolean): void {
    for (const binding of this.triggerBindings) {
      if (binding.mouseButton === button) {
        this._inputManager.setTriggerInput(this, binding, isDown);
      }
    }

    // A hold action is held while any of its buttons is, so releasing one of
    // two buttons bound to the same action doesn't end the hold.
    const reportedActions = new Set<HoldAction>();

    for (const binding of this.holdBindings) {
      if (
        reportedActions.has(binding.action) ||
        binding.mouseButton !== button
      ) {
        continue;
      }

      reportedActions.add(binding.action);

      let isActionDown = false;

      for (const other of this.holdBindings) {
        if (
          other.action === binding.action &&
          this._mouseButtonPresses.has(other.mouseButton)
        ) {
          isActionDown = true;
        }
      }

      this._inputManager.setHoldInput(this, binding.action, isActionDown);
    }
  }

  private _reportWheel(): void {
    const reportedActions = new Set<Axis1dAction>();

    for (const binding of this.axis1dBindings) {
      if (reportedActions.has(binding.action)) {
        continue;
      }

      reportedActions.add(binding.action);
      this._inputManager.setAxis1dInput(this, binding.action, this._wheelInput);
    }
  }

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
        this._inputManager.setAxis2dInput(
          this,
          binding.action,
          x - absoluteXOffset,
          y - absoluteYOffset,
        );
      } else if (cursorValueType === cursorValueTypes.ratio) {
        this._inputManager.setAxis2dInput(
          this,
          binding.action,
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
