import { KeyCode } from '../constants';
import { InputInteraction } from './input-interaction';
import { KeyboardAxis1dInputSource } from '../input-sources/keyboard-axis1d-input-source';

export interface KeyboardAxis1dInteractionArgs {
  negativeKey: KeyCode;
  positiveKey: KeyCode;
}

export class KeyboardAxis1dInteraction extends InputInteraction<KeyboardAxis1dInteractionArgs> {
  public negativeKey: KeyCode;
  public positiveKey: KeyCode;

  constructor(
    inputSource: KeyboardAxis1dInputSource,
    negativeKey: KeyCode,
    positiveKey: KeyCode,
  ) {
    super({ negativeKey, positiveKey }, inputSource);
    this.negativeKey = negativeKey;
    this.positiveKey = positiveKey;
  }

  public override matchesArgs(args: KeyboardAxis1dInteractionArgs): boolean {
    return (
      this.args.negativeKey === args.negativeKey &&
      this.args.positiveKey === args.positiveKey
    );
  }

  override get displayText(): string {
    return `On keyboard axis (${this.args.negativeKey} / ${this.args.positiveKey})`;
  }
}
