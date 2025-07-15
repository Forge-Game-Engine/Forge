import { InputSource } from './input-sources';
import { TriggerAction, InputAxis1d, Axis2dAction } from './input-types';

export class InputGroup {
  public readonly name: string;
  public readonly sources: Set<InputSource>;
  public readonly actions: Map<string, TriggerAction>;
  public readonly axis1ds: Map<string, InputAxis1d>;
  public readonly axis2ds: Map<string, Axis2dAction>;

  constructor(name: string) {
    this.name = name;
    this.sources = new Set<InputSource>();
    this.actions = new Map<string, TriggerAction>();
    this.axis1ds = new Map<string, InputAxis1d>();
    this.axis2ds = new Map<string, Axis2dAction>();
  }
}
