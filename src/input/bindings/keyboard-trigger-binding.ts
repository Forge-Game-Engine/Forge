import { TriggerAction } from '../actions';
import { ButtonMoment, KeyCode } from '../constants';
import { InputBinding } from './input-binding';

export interface KeyboardTriggerBindingArgs {
  keyCode: KeyCode;
  moment: ButtonMoment;
}

export class KeyboardTriggerBinding
  implements InputBinding<TriggerAction>, KeyboardTriggerBindingArgs
{
  public readonly action: TriggerAction;
  public readonly keyCode: KeyCode;
  public readonly moment: ButtonMoment;
  public readonly displayText: string;

  constructor(action: TriggerAction, keyCode: KeyCode, moment: ButtonMoment) {
    this.action = action;
    this.keyCode = keyCode;
    this.moment = moment;
    this.displayText = `${keyCode} key ${moment}`;
  }
}
