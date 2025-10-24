import { Axis1dAction } from '../../actions/index.js';
import { KeyCode } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Arguments for constructing a KeyboardAxis1dBinding. */
export interface KeyboardAxis1dBindingArgs {
  /** The key code associated with the positive direction. */
  positiveKeyCode: KeyCode;
  /** The key code associated with the negative direction. */
  negativeKeyCode: KeyCode;
}

/** Keyboard axis-1d input binding. */
export class KeyboardAxis1dBinding
  implements InputBinding<Axis1dAction>, KeyboardAxis1dBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: Axis1dAction;
  /** The key code associated with the positive direction. */
  public readonly positiveKeyCode: KeyCode;
  /** The key code associated with the negative direction. */
  public readonly negativeKeyCode: KeyCode;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new KeyboardAxis1dBinding.
   * @param action - The action associated with this binding.
   * @param positiveKeyCode - The key code for the positive direction.
   * @param negativeKeyCode - The key code for the negative direction.
   */
  constructor(
    action: Axis1dAction,
    positiveKeyCode: KeyCode,
    negativeKeyCode: KeyCode,
  ) {
    this.action = action;

    this.positiveKeyCode = positiveKeyCode;
    this.negativeKeyCode = negativeKeyCode;

    this.displayText = `${negativeKeyCode}, ${positiveKeyCode} keys`;
  }
}
