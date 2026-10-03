import { Axis2dAction } from '../../actions/index.js';
import { GamepadAxisIndex, GamepadButtonIndex } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Drives a 2D axis from a pair of analog gamepad axes, such as a thumbstick. */
export interface GamepadStickAxis2dBindingArgs {
  /** The index of the gamepad axis to read the X value from. */
  xAxisIndex: GamepadAxisIndex;
  /**
   * The index of the gamepad axis to read the Y value from. A stick pushed up
   * reads as positive, matching `KeyboardAxis2dBinding` and the button form
   * of `GamepadAxis2dBinding`.
   */
  yAxisIndex: GamepadAxisIndex;
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

/** Gamepad axis-2d input binding, driven by either an analog stick or four buttons. */
export class GamepadAxis2dBinding implements InputBinding<Axis2dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis2dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;
  /** The gamepad axes or buttons this binding reads its value from. */
  public readonly source: GamepadAxis2dBindingArgs;

  /** Constructs a new GamepadAxis2dBinding.
   * @param action - The action associated with this binding.
   * @param source - Either an `xAxisIndex`/`yAxisIndex` pair for an analog stick, or north/south/east/west button indices for digital buttons.
   */
  constructor(action: Axis2dAction, source: GamepadAxis2dBindingArgs) {
    this.action = action;
    this.source = source;
    this.displayText =
      'xAxisIndex' in source
        ? `gamepad axes ${source.xAxisIndex}/${source.yAxisIndex}`
        : `gamepad buttons ${source.northButtonIndex}/${source.westButtonIndex}/${source.southButtonIndex}/${source.eastButtonIndex}`;
  }
}
