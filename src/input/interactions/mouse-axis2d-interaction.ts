import { ActionableInputSource } from '../input-sources';
import { InputInteraction } from './input-interaction';

export class MouseAxis2dInteraction extends InputInteraction<void> {
  constructor(source: ActionableInputSource) {
    super(undefined, source);
  }

  public override matchesArgs(): boolean {
    return true; // This interaction does not have specific args to match against as it is the cursor position.
  }

  override get displayText(): string {
    return 'Cursor position';
  }
}
