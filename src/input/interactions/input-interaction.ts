import MurmurHash3 from 'imurmurhash';
import { ActionableInputSource } from '../input-sources';

/**
 * InputInteraction represents an interaction with an input source.
 */
export abstract class InputInteraction<TArgs = unknown> {
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
    const idHash = MurmurHash3().hash(this.source.name);

    if (this.args) {
      idHash.hash(JSON.stringify(this.args));
    }

    return idHash.result().toString(16);
  }

  get displayText(): string {
    return `(${this.source.name}) ${JSON.stringify(this.args)}`;
  }
}
