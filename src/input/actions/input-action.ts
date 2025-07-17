import { Resettable } from '../../common';

export interface InputAction extends Resettable {
  get name(): string;
}
