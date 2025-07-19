import { ButtonMoment, KeyCode } from '../constants';
import { InputBinding } from './input-binding';

export interface KeyboardBindArgs {
  moment: ButtonMoment;
  keyCode: KeyCode;
}

export class KeyboardTriggerBinding extends InputBinding<KeyboardBindArgs> {
  public override matchesArgs(args: KeyboardBindArgs): boolean {
    return (
      this.args.moment === args.moment && this.args.keyCode === args.keyCode
    );
  }

  override get displayText(): string {
    return `On "${this.args.keyCode}" ${this.args.moment}`;
  }
}
