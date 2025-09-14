import { InputAction } from '../actions';

export interface InputBinding<TAction extends InputAction> {
  action: TAction;
  displayText: string;
}
