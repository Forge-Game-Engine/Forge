import { Axis1dAction } from '../../actions/index.js';
import { GamepadAxisIndex, GamepadButtonIndex } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Drives an axis from a single analog gamepad axis, such as a thumbstick. */
export interface GamepadStickAxis1dBindingArgs {
  /** The index of the gamepad axis to read. */
  axisIndex: GamepadAxisIndex;
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

/** Gamepad axis-1d input binding, driven by either an analog stick or a pair of buttons. */
export class GamepadAxis1dBinding implements InputBinding<Axis1dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis1dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;
  /** The gamepad axis or buttons this binding reads its value from. */
  public readonly source: GamepadAxis1dBindingArgs;

  /** Constructs a new GamepadAxis1dBinding.
   * @param action - The action associated with this binding.
   * @param source - Either an `axisIndex` for an analog stick, or a `positiveButtonIndex`/`negativeButtonIndex` pair for digital buttons.
   */
  constructor(action: Axis1dAction, source: GamepadAxis1dBindingArgs) {
    this.action = action;
    this.source = source;

    this.displayText =
      'axisIndex' in source
        ? `gamepad axis ${source.axisIndex}`
        : `gamepad buttons ${source.negativeButtonIndex}/${source.positiveButtonIndex}`;
  }
}
