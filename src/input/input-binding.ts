import { InputAction } from './input-action';

export interface InputBinding<TAction extends InputAction> {
  action: TAction;
  displayText: string;
}
