import MurmurHash3 from 'imurmurhash';
import { ActionableInputSource } from './input-sources';

/**
 * InputBinding represents a binding between an input action and an input source.
 * It includes the action, arguments, source, and display text for the binding.
 */
export abstract class InputBinding<TArgs = unknown> {
  public id: string;
  public readonly args: TArgs;
  public readonly source: ActionableInputSource;

  constructor(args: TArgs, source: ActionableInputSource) {
    this.args = args;
    this.source = source;

    this.id = this._generateId();
  }

  public matchesArgs(args: TArgs): boolean {
    return JSON.stringify(this.args) === JSON.stringify(args);
  }

  private _generateId() {
    const idHash = MurmurHash3()
      .hash(this.source.name)
      .hash(JSON.stringify(this.args));

    return idHash.result().toString(16);
  }

  get displayText(): string {
    return `(${this.source.name}) ${JSON.stringify(this.args)}`;
  }
}
