import { TriggerAction } from '../../actions/index.js';
import {
  ButtonMoment,
  getMouseButtonName,
  MouseButton,
} from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Arguments for constructing a MouseTriggerBinding. */
export interface MouseTriggerBindingArgs {
  /** The mouse button associated with this binding. */
  mouseButton: MouseButton;
  /** The button moment associated with this binding. */
  moment: ButtonMoment;
}

/** Mouse trigger input binding. */
export class MouseTriggerBinding
  implements InputBinding<TriggerAction>, MouseTriggerBindingArgs
{
  /** The action associated with this binding. */
  public readonly action: TriggerAction;
  /** The mouse button associated with this binding. */
  public readonly mouseButton: MouseButton;
  /** The button moment associated with this binding. */
  public readonly moment: ButtonMoment;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new MouseTriggerBinding.
   * @param action - The action associated with this binding.
   * @param mouseButton - The mouse button associated with this binding.
   * @param moment - The button moment associated with this binding.
   */
  constructor(
    action: TriggerAction,
    mouseButton: MouseButton,
    moment: ButtonMoment,
  ) {
    this.action = action;
    this.mouseButton = mouseButton;
    this.moment = moment;
    this.displayText = `${getMouseButtonName(mouseButton)} mouse button ${moment}`;
  }
}
