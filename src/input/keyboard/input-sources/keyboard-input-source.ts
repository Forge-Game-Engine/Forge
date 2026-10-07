import { Stoppable } from '../../../common/index.js';
import { clamp } from '../../../math/index.js';
import { Axis1dAction, Axis2dAction, HoldAction } from '../../actions/index.js';
import { KeyboardHoldBinding } from '../bindings/keyboard-hold-binding.js';
import { KeyCode } from '../../constants/index.js';
import { InputManager } from '../../input-manager.js';
import {
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardTriggerBinding,
} from '../bindings/index.js';
import {
  Axis1dInputSource,
  Axis2dInputSource,
  HoldInputSource,
  TriggerInputSource,
} from '../../input-sources/index.js';

/**
 * Whether `event` was typed into an editable element: an `<input>`,
 * `<textarea>`, `<select>` or a `contentEditable` element. Reads the
 * event's composed path rather than `target`, since at the window `target`
 * is the shadow host for an element inside a shadow root.
 */
function isTypedIntoEditableElement(event: KeyboardEvent): boolean {
  const [origin] = event.composedPath();

  if (!(origin instanceof HTMLElement)) {
    return false;
  }

  return (
    origin instanceof HTMLInputElement ||
    origin instanceof HTMLTextAreaElement ||
    origin instanceof HTMLSelectElement ||
    origin.isContentEditable
  );
}

/**
 * Represents a keyboard input source with associated bindings. It reports
 * the keys held to its `InputManager` whenever a key goes down or comes up.
 */
export class KeyboardInputSource
  implements
    TriggerInputSource<KeyboardTriggerBinding>,
    HoldInputSource<KeyboardHoldBinding>,
    Axis2dInputSource<KeyboardAxis2dBinding>,
    Axis1dInputSource<KeyboardAxis1dBinding>,
    Stoppable
{
  /** The set of trigger bindings associated with this input source. */
  public readonly triggerBindings = new Set<KeyboardTriggerBinding>();

  /** The set of hold bindings associated with this input source. */
  public readonly holdBindings = new Set<KeyboardHoldBinding>();

  /** The set of axis-2d bindings associated with this input source. */
  public readonly axis2dBindings = new Set<KeyboardAxis2dBinding>();

  /** The set of axis-1d bindings associated with this input source. */
  public readonly axis1dBindings = new Set<KeyboardAxis1dBinding>();

  public readonly name = 'Keyboard';

  private readonly _inputManager: InputManager;

  /**
   * The keys the game saw go down and hasn't seen released yet. A key typed
   * into an editable element never enters this set, and a release of a key
   * that isn't in it is ignored, so typing into an HTML text box (Forge's
   * own text fields included) never reaches the game, while a key held
   * before typing started is still released.
   */
  private readonly _keyHolds = new Set<KeyCode>();

  /** Constructs a new KeyboardInputSource.
   * @param inputManager - The input manager to associate with this input source.
   */
  constructor(inputManager: InputManager) {
    this._inputManager = inputManager;

    globalThis.addEventListener('keydown', this._onKeyDownHandler);
    globalThis.addEventListener('keyup', this._onKeyUpHandler);
  }

  /** Stops listening to the keyboard and releases every key this source was holding. */
  public stop(): void {
    globalThis.removeEventListener('keydown', this._onKeyDownHandler);
    globalThis.removeEventListener('keyup', this._onKeyUpHandler);
    this._keyHolds.clear();
    this._inputManager.removeSourceInput(this);
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
    if (event.repeat) {
      return;
    }

    if (isTypedIntoEditableElement(event)) {
      return;
    }

    const keyCode = event.code as KeyCode;

    this._keyHolds.add(keyCode);
    this._reportKey(keyCode, true);
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
    if (event.repeat) {
      return;
    }

    const keyCode = event.code as KeyCode;

    if (!this._keyHolds.has(keyCode)) {
      return;
    }

    this._keyHolds.delete(keyCode);
    this._reportKey(keyCode, false);
  };

  private _reportKey(keyCode: KeyCode, isDown: boolean): void {
    for (const binding of this.triggerBindings) {
      if (binding.keyCode === keyCode) {
        this._inputManager.setTriggerInput(this, binding, isDown);
      }
    }

    this._reportHoldBindings(keyCode);
    this._reportAxis1dBindings(keyCode);
    this._reportAxis2dBindings(keyCode);
  }

  /**
   * Reports every hold action bound to `keyCode` as held while any of its
   * keys is, so releasing one of two keys bound to the same action doesn't
   * end the hold.
   */
  private _reportHoldBindings(keyCode: KeyCode): void {
    const reportedActions = new Set<HoldAction>();

    for (const binding of this.holdBindings) {
      if (reportedActions.has(binding.action) || binding.keyCode !== keyCode) {
        continue;
      }

      reportedActions.add(binding.action);

      let isDown = false;

      for (const other of this.holdBindings) {
        if (
          other.action === binding.action &&
          this._keyHolds.has(other.keyCode)
        ) {
          isDown = true;
        }
      }

      this._inputManager.setHoldInput(this, binding.action, isDown);
    }
  }

  /**
   * Reports every axis-1d action bound to `keyCode`, with its value derived
   * from which of its keys are held right now.
   */
  private _reportAxis1dBindings(keyCode: KeyCode): void {
    const reportedActions = new Set<Axis1dAction>();

    for (const binding of this.axis1dBindings) {
      if (
        reportedActions.has(binding.action) ||
        (binding.positiveKeyCode !== keyCode &&
          binding.negativeKeyCode !== keyCode)
      ) {
        continue;
      }

      reportedActions.add(binding.action);
      this._inputManager.setAxis1dInput(
        this,
        binding.action,
        this._readAxis1dValue(binding.action),
      );
    }
  }

  /** Reports every axis-2d action bound to `keyCode`, see `_reportAxis1dBindings`. */
  private _reportAxis2dBindings(keyCode: KeyCode): void {
    const reportedActions = new Set<Axis2dAction>();

    for (const binding of this.axis2dBindings) {
      if (
        reportedActions.has(binding.action) ||
        (binding.northKeyCode !== keyCode &&
          binding.southKeyCode !== keyCode &&
          binding.eastKeyCode !== keyCode &&
          binding.westKeyCode !== keyCode)
      ) {
        continue;
      }

      reportedActions.add(binding.action);

      const { x, y } = this._readAxis2dValue(binding.action);

      this._inputManager.setAxis2dInput(this, binding.action, x, y);
    }
  }

  /**
   * Combines every axis-1d binding on this source that targets `action`
   * (e.g. both A/D and the arrow keys), so opposite keys cancel out and two
   * keys for the same direction don't add up past `1`.
   */
  private _readAxis1dValue(action: Axis1dAction): number {
    let value = 0;

    for (const binding of this.axis1dBindings) {
      if (binding.action === action) {
        value +=
          this._readKey(binding.positiveKeyCode) -
          this._readKey(binding.negativeKeyCode);
      }
    }

    return clamp(value, -1, 1);
  }

  /** Combines every axis-2d binding on this source that targets `action`, see `_readAxis1dValue`. */
  private _readAxis2dValue(action: Axis2dAction): { x: number; y: number } {
    let x = 0;
    let y = 0;

    for (const binding of this.axis2dBindings) {
      if (binding.action === action) {
        x +=
          this._readKey(binding.eastKeyCode) -
          this._readKey(binding.westKeyCode);
        y +=
          this._readKey(binding.northKeyCode) -
          this._readKey(binding.southKeyCode);
      }
    }

    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  private _readKey(keyCode: KeyCode): number {
    return this._keyHolds.has(keyCode) ? 1 : 0;
  }
}
