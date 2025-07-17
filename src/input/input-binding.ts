import MurmurHash3 from 'imurmurhash';
import { InputAction } from './actions';
import { ActionableInputSource } from './input-sources';

/**
 * InputBinding represents a binding between an input action and an input source.
 * It includes the action, arguments, source, and display text for the binding.
 */
export abstract class InputBinding<TAction extends InputAction, TArgs> {
  public id: string;
  public readonly action: TAction;
  public readonly args: TArgs;
  public readonly source: ActionableInputSource;

  constructor(action: TAction, args: TArgs, source: ActionableInputSource) {
    this.action = action;
    this.args = args;
    this.source = source;

    this.id = this._generateId();
  }

  public matchesArgs(args: TArgs): boolean {
    return JSON.stringify(this.args) === JSON.stringify(args);
  }

  private _generateId() {
    const idHash = MurmurHash3()
      .hash(this.action.name)
      .hash(this.source.name)
      .hash(JSON.stringify(this.args)); // TODO: maybe we need to add the input group name too?

    return idHash.result().toString(16);
  }

  get displayText(): string {
    return `(${this.source.name}) ${JSON.stringify(this.args)}`;
  }
}
