import { Axis2dAction } from '../../actions/index.js';
import { GamepadAxisIndex, GamepadButtonIndex } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Drives a 2D axis from a pair of analog gamepad axes, such as a thumbstick. */
export interface GamepadStickAxis2dBindingArgs {
  /** The index of the gamepad axis to read the X value from. */
  xAxisIndex: GamepadAxisIndex;
  /** The index of the gamepad axis to read the Y value from. */
  yAxisIndex: GamepadAxisIndex;
  /** Whether to negate the X value before dispatching it. Defaults to `false`. */
  invertX?: boolean;
  /**
   * Whether to negate the Y value before dispatching it. The W3C Standard
   * Gamepad reports a stick pushed up as `-1`, so set this to drive an
   * action where up (north) is positive, matching `KeyboardAxis2dBinding`
   * and the button form of `GamepadAxis2dBinding`. Defaults to `false`.
   */
  invertY?: boolean;
}

/** Drives a 2D axis from four digital gamepad buttons, such as the D-pad. */
export interface GamepadButtonsAxis2dBindingArgs {
  /** The index of the button that drives Y towards 1. */
  northButtonIndex: GamepadButtonIndex;
  /** The index of the button that drives Y towards -1. */
  southButtonIndex: GamepadButtonIndex;
  /** The index of the button that drives X towards 1. */
  eastButtonIndex: GamepadButtonIndex;
  /** The index of the button that drives X towards -1. */
  westButtonIndex: GamepadButtonIndex;
}

/** Arguments for constructing a GamepadAxis2dBinding. */
export type GamepadAxis2dBindingArgs =
  GamepadStickAxis2dBindingArgs | GamepadButtonsAxis2dBindingArgs;

const defaultGamepadStickAxis2dBindingArgs = {
  invertX: false,
  invertY: false,
};

/** Gamepad axis-2d input binding, driven by either an analog stick or four buttons. */
export class GamepadAxis2dBinding implements InputBinding<Axis2dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis2dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;
  /**
   * The gamepad axes or buttons this binding reads its value from. For a
   * stick, `invertX` and `invertY` are always populated, falling back to
   * their defaults.
   */
  public readonly source: GamepadAxis2dBindingArgs;

  /** Constructs a new GamepadAxis2dBinding.
   * @param action - The action associated with this binding.
   * @param source - Either an `xAxisIndex`/`yAxisIndex` pair (and optionally `invertX`/`invertY`) for an analog stick, or north/south/east/west button indices for digital buttons.
   */
  constructor(action: Axis2dAction, source: GamepadAxis2dBindingArgs) {
    this.action = action;

    if ('xAxisIndex' in source) {
      const stickSource = {
        ...defaultGamepadStickAxis2dBindingArgs,
        ...source,
      };

      this.source = stickSource;
      this.displayText = `gamepad axes ${stickSource.xAxisIndex}${stickSource.invertX ? ' (inverted)' : ''}/${stickSource.yAxisIndex}${stickSource.invertY ? ' (inverted)' : ''}`;

      return;
    }

    this.source = source;
    this.displayText = `gamepad buttons ${source.northButtonIndex}/${source.westButtonIndex}/${source.southButtonIndex}/${source.eastButtonIndex}`;
  }
}
