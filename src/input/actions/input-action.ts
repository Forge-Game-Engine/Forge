import { Resettable } from '../../common';
import { InputInteraction } from '../interactions';
import { InputGroup } from '../input-group';

export interface InputAction extends Resettable {
  get name(): string;
  bind<TArgs>(interaction: InputInteraction<TArgs>, group: InputGroup): void;
}
