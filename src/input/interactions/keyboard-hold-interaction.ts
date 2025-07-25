import { ButtonMoment, KeyCode } from '../constants';
import { InputInteraction } from './input-interaction';

export interface KeyboardHoldInteractionArgs {
  moment: ButtonMoment;
  keyCode: KeyCode;
}

export class KeyboardHoldInteraction extends InputInteraction<KeyboardHoldInteractionArgs> {
  public override matchesArgs(args: KeyboardHoldInteractionArgs): boolean {
    return (
      this.args.moment === args.moment && this.args.keyCode === args.keyCode
    );
  }

  override get displayText(): string {
    return `On "${this.args.keyCode}" ${this.args.moment}`;
  }
}
