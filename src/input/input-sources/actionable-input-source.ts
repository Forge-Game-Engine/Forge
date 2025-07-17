import { InputSource } from './input-source';

export interface ActionableInputSource extends InputSource {
  get name(): string;
}
