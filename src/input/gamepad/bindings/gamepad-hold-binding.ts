import { HoldAction } from '../../actions/index.js';
import { GamepadButtonIndex } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Arguments for constructing a GamepadHoldBinding. */
export interface GamepadHoldBindingArgs {
  /** The index of the gamepad button associated with this binding. */
  buttonIndex: GamepadButtonIndex;
}

/** Gamepad hold input binding, held for as long as its button is pressed. */
export class GamepadHoldBinding
  implements InputBinding<HoldAction>, GamepadHoldBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: HoldAction;
  /** The index of the gamepad button associated with this binding. */
  public readonly buttonIndex: GamepadButtonIndex;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new GamepadHoldBinding.
   * @param action - The action associated with this binding.
   * @param buttonIndex - The index of the gamepad button associated with this binding.
   */
  constructor(action: HoldAction, buttonIndex: GamepadButtonIndex) {
    this.action = action;
    this.buttonIndex = buttonIndex;
    this.displayText = `gamepad button ${buttonIndex} hold`;
  }
}
