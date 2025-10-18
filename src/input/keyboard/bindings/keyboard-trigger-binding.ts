import { TriggerAction } from 'forge/input/actions';
import { ButtonMoment, KeyCode } from 'forge/input/constants';
import { InputBinding } from 'forge/input/input-binding';

/** Arguments for constructing a KeyboardTriggerBinding. */
export interface KeyboardTriggerBindingArgs {
  /** The key code associated with this binding. */
  keyCode: KeyCode;
  /** The button moment associated with this binding. */
  moment: ButtonMoment;
}

/** Keyboard trigger input binding. */
export class KeyboardTriggerBinding
  implements InputBinding<TriggerAction>, KeyboardTriggerBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: TriggerAction;
  /** The key code associated with this binding. */
  public readonly keyCode: KeyCode;
  /** The button moment associated with this binding. */
  public readonly moment: ButtonMoment;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new KeyboardTriggerBinding.
   * @param action - The action associated with this binding.
   * @param keyCode - The key code associated with this binding.
   * @param moment - The button moment associated with this binding.
   */
  constructor(action: TriggerAction, keyCode: KeyCode, moment: ButtonMoment) {
    this.action = action;
    this.keyCode = keyCode;
    this.moment = moment;
    this.displayText = `${keyCode} key ${moment}`;
  }
}
