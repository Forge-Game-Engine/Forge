import { Axis1dAction } from '../../actions/index.js';
import { GamepadAxisIndex, GamepadButtonIndex } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Drives an axis from a single analog gamepad axis, such as a thumbstick. */
export interface GamepadStickAxis1dBindingArgs {
  /** The index of the gamepad axis to read. */
  axisIndex: GamepadAxisIndex;
  /**
   * Whether to negate the axis's value before dispatching it. The W3C
   * Standard Gamepad reports a stick pushed up as `-1`, so set this on a
   * stick's Y axis to drive an action where up is positive (as
   * `KeyboardAxis1dBinding(action, keyCodes.w, keyCodes.s)` does). Defaults
   * to `false`.
   */
  inverted?: boolean;
}

/** Drives an axis from a pair of digital gamepad buttons, such as the D-pad. */
export interface GamepadButtonsAxis1dBindingArgs {
  /** The index of the button that drives the axis towards 1. */
  positiveButtonIndex: GamepadButtonIndex;
  /** The index of the button that drives the axis towards -1. */
  negativeButtonIndex: GamepadButtonIndex;
}

/** Arguments for constructing a GamepadAxis1dBinding. */
export type GamepadAxis1dBindingArgs =
  GamepadStickAxis1dBindingArgs | GamepadButtonsAxis1dBindingArgs;

const defaultGamepadStickAxis1dBindingArgs = {
  inverted: false,
};

/** Gamepad axis-1d input binding, driven by either an analog stick or a pair of buttons. */
export class GamepadAxis1dBinding implements InputBinding<Axis1dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis1dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;
  /**
   * The gamepad axis or buttons this binding reads its value from. For a
   * stick, `inverted` is always populated, falling back to its default.
   */
  public readonly source: GamepadAxis1dBindingArgs;

  /** Constructs a new GamepadAxis1dBinding.
   * @param action - The action associated with this binding.
   * @param source - Either an `axisIndex` (and optionally `inverted`) for an analog stick, or a `positiveButtonIndex`/`negativeButtonIndex` pair for digital buttons.
   */
  constructor(action: Axis1dAction, source: GamepadAxis1dBindingArgs) {
    this.action = action;

    if ('axisIndex' in source) {
      const stickSource = {
        ...defaultGamepadStickAxis1dBindingArgs,
        ...source,
      };

      this.source = stickSource;
      this.displayText = `gamepad axis ${stickSource.axisIndex}${stickSource.inverted ? ' (inverted)' : ''}`;

      return;
    }

    this.source = source;
    this.displayText = `gamepad buttons ${source.negativeButtonIndex}/${source.positiveButtonIndex}`;
  }
}
