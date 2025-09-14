import { Axis1dAction } from '../actions';
import { InputBinding } from './input-binding';

export class MouseAxis1dBinding implements InputBinding<Axis1dAction> {
  public readonly action: Axis1dAction;
  public readonly displayText: string;

  constructor(action: Axis1dAction) {
    this.action = action;
    this.displayText = 'mouse scroll';
  }
}
