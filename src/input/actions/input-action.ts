import { InputInteraction } from '../interactions';
import { InputGroup } from '../input-group';

export interface InputAction {
  get name(): string;
  bind<TArgs>(interaction: InputInteraction<TArgs>, group: InputGroup): void;
}
