import { ButtonMoment, KeyCode } from '../constants';
import { InputInteraction } from './input-interaction';

export interface KeyboardTriggerInteractionArgs {
  moment: ButtonMoment;
  keyCode: KeyCode;
}

export class KeyboardTriggerInteraction extends InputInteraction<KeyboardTriggerInteractionArgs> {
  public override matchesArgs(args: KeyboardTriggerInteractionArgs): boolean {
    return (
      this.args.moment === args.moment && this.args.keyCode === args.keyCode
    );
  }

  override get displayText(): string {
    return `On "${this.args.keyCode}" ${this.args.moment}`;
  }
}
