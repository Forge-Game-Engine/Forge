import { Resettable } from '../../common';
import { InputBinding } from '../bindings';
import { InputGroup } from '../input-group';

export interface InputAction extends Resettable {
  get name(): string;
  bind<TArgs>(binding: InputBinding<TArgs>, group: InputGroup): void;
}
