import { MouseInputSource } from '../input-sources';
import { InputInteraction } from './input-interaction';

export class MouseAxis1dInteraction extends InputInteraction<void> {
  constructor(source: MouseInputSource) {
    super(undefined, source);
  }

  public override matchesArgs(): boolean {
    return true; // This interaction does not have specific args to match against as it is the scroll wheel.
  }

  override get displayText(): string {
    return 'On mouse scroll';
  }
}
