import { HoldAction } from '../actions';
import { ButtonMoment, KeyCode } from '../constants';
import { InputBinding } from './input-binding';

export interface KeyboardHoldBindingArgs {
  keyCode: KeyCode;
}

export class KeyboardHoldBinding
  implements InputBinding<HoldAction>, KeyboardHoldBindingArgs
{
  public readonly action: HoldAction;
  public readonly keyCode: KeyCode;
  public readonly displayText: string;

  constructor(action: HoldAction, keyCode: KeyCode) {
    this.action = action;
    this.keyCode = keyCode;
    this.displayText = `${keyCode} key hold`;
  }
}
