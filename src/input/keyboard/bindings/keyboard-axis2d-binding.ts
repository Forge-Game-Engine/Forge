import { Axis2dAction } from '../../actions/index.js';
import { KeyCode } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Arguments for constructing a KeyboardAxis2dBinding. */
export interface KeyboardAxis2dBindingArgs {
  /** The key code associated with the north direction. */
  northKeyCode: KeyCode;
  /** The key code associated with the south direction. */
  southKeyCode: KeyCode;
  /** The key code associated with the east direction. */
  eastKeyCode: KeyCode;
  /** The key code associated with the west direction. */
  westKeyCode: KeyCode;
}

/** Keyboard axis-2d input binding. */
export class KeyboardAxis2dBinding
  implements InputBinding<Axis2dAction>, KeyboardAxis2dBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: Axis2dAction;
  /** The key code associated with the north direction. */
  public readonly northKeyCode: KeyCode;
  /** The key code associated with the south direction. */
  public readonly southKeyCode: KeyCode;
  /** The key code associated with the east direction. */
  public readonly eastKeyCode: KeyCode;
  /** The key code associated with the west direction. */
  public readonly westKeyCode: KeyCode;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new KeyboardAxis2dBinding.
   * @param action - The action associated with this binding.
   * @param northKeyCode - The key code associated with the north direction.
   * @param southKeyCode - The key code associated with the south direction.
   * @param eastKeyCode - The key code associated with the east direction.
   * @param westKeyCode - The key code associated with the west direction.
   */
  constructor(
    action: Axis2dAction,
    northKeyCode: KeyCode,
    southKeyCode: KeyCode,
    eastKeyCode: KeyCode,
    westKeyCode: KeyCode,
  ) {
    this.action = action;

    this.northKeyCode = northKeyCode;
    this.southKeyCode = southKeyCode;
    this.eastKeyCode = eastKeyCode;
    this.westKeyCode = westKeyCode;

    this.displayText = `${northKeyCode}, ${westKeyCode}, ${southKeyCode}, ${eastKeyCode} keys`;
  }
}
