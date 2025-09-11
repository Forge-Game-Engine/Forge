import { AtLeastOne } from '../../utilities';
import { KeyCode } from '../constants';
import { InputInteraction } from './input-interaction';

interface OptionalKeyboardAxis1dInteractionArgs {
  negativeKey?: KeyCode;
  positiveKey?: KeyCode;
}

export type KeyboardAxis1dInteractionArgs = AtLeastOne<
  OptionalKeyboardAxis1dInteractionArgs,
  'negativeKey' | 'positiveKey'
>;

export class KeyboardAxis1dInteraction extends InputInteraction<KeyboardAxis1dInteractionArgs> {
  public matchesArgs = (args: KeyboardAxis1dInteractionArgs): boolean => {
    // only needs to match one key as it's an axis
    return (
      this.args.positiveKey === args.positiveKey ||
      this.args.negativeKey === args.negativeKey
    );
  };

  override get displayText(): string {
    return `On keyboard axis (${this.args.negativeKey} / ${this.args.positiveKey})`;
  }
}
