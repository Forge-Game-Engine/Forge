import { HoldAction } from 'forge/input/actions';
import { KeyCode } from 'forge/input/constants';
import { InputBinding } from 'forge/input/input-binding';

/** Arguments for constructing a KeyboardHoldBinding. */
export interface KeyboardHoldBindingArgs {
  /** The key code associated with this binding. */
  keyCode: KeyCode;
}

/** Keyboard hold input binding. */
export class KeyboardHoldBinding
  implements InputBinding<HoldAction>, KeyboardHoldBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: HoldAction;
  /** The key code associated with this binding. */
  public readonly keyCode: KeyCode;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new KeyboardHoldBinding.
   * @param action - The action associated with this binding.
   * @param keyCode - The key code associated with this binding.
   */
  constructor(action: HoldAction, keyCode: KeyCode) {
    this.action = action;
    this.keyCode = keyCode;
    this.displayText = `${keyCode} key hold`;
  }
}
