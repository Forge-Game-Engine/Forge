import { TriggerAction } from '../actions';
import { ButtonMoment, getMouseButtonName, MouseButton } from '../constants';
import { InputBinding } from './input-binding';

export interface MouseTriggerBindingArgs {
  mouseButton: MouseButton;
  moment: ButtonMoment;
}

export class MouseTriggerBinding
  implements InputBinding<TriggerAction>, MouseTriggerBindingArgs
{
  public readonly action: TriggerAction;
  public readonly mouseButton: MouseButton;
  public readonly moment: ButtonMoment;
  public readonly displayText: string;

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
