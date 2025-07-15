import { Resettable } from '../../common';

export interface InputAction extends Resettable {
  bind(binding: InputBinding): void;
  unbind(id: string): void;
}

export interface InputBinding {
  bindingId: string;
  sourceName: string;
  displayText: string;
}
