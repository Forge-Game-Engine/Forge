import { ButtonMoment, MouseButton } from '../constants';
import { InputInteraction } from './input-interaction';

export interface MouseTriggerInteractionArgs {
  moment: ButtonMoment;
  mouseButton: MouseButton;
}

export class MouseTriggerInteraction extends InputInteraction<MouseTriggerInteractionArgs> {
  public override matchesArgs(args: MouseTriggerInteractionArgs): boolean {
    return (
      this.args.moment === args.moment &&
      this.args.mouseButton === args.mouseButton
    );
  }

  override get displayText(): string {
    return `On "${this.args.mouseButton}" ${this.args.moment}`;
  }
}
