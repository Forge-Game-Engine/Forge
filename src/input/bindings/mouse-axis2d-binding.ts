import { Axis2dAction } from '../actions';
import { InputBinding } from './input-binding';

export class MouseAxis2dBinding implements InputBinding<Axis2dAction> {
  public readonly action: Axis2dAction;
  public readonly displayText: string;

  constructor(action: Axis2dAction) {
    this.action = action;
    this.displayText = 'mouse position';
  }
}
