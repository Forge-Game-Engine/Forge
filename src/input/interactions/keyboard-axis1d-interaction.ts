import { ActionableInputSource } from '../input-sources';
import { InputInteraction } from './input-interaction';

export class KeyboardAxis1dInteraction extends InputInteraction<void> {
  constructor(source: ActionableInputSource) {
    super(undefined, source);
  }

  public override matchesArgs(): boolean {
    return true;
  }

  override get displayText(): string {
    return 'On keyboard axis';
  }
}
