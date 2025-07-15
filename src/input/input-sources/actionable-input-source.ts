import { TriggerAction } from '../input-types';
import { InputSource } from './input-source';

export interface ActionableInputSource<TArgs> extends InputSource {
  bindAction(inputAction: TriggerAction, args: TArgs): void;
}
