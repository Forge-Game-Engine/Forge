import MurmurHash3 from 'imurmurhash';
import { InputSource } from '../input-sources';

/**
 * InputInteraction represents an interaction with an input source.
 */
export abstract class InputInteraction<TArgs = unknown> {
  public id: string;
  public readonly args: TArgs;
  public readonly source: InputSource;

  constructor(args: TArgs, source: InputSource) {
    this.args = args;
    this.source = source;

    this.id = this._generateId();
  }

  public matches(interaction: InputInteraction<TArgs>): boolean {
    return (
      this.matchesArgs(interaction.args) &&
      this.matchesSource(interaction.source)
    );
  }

  public matchesSource(source: InputSource): boolean {
    return source === this.source;
  }

  protected matchesArgs(args: TArgs): boolean {
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
