import { ActionableInputSource } from '../input-sources';
import { InputBinding } from './input-binding';

export class MouseAxis1dBinding extends InputBinding<void> {
  constructor(source: ActionableInputSource) {
    super(undefined, source);
  }

  public override matchesArgs(): boolean {
    return true; // This binding does not have specific args to match against as it is the scroll axis.
  }

  override get displayText(): string {
    return 'On mouse scroll';
  }
}
