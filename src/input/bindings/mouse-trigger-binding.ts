import { ButtonMoment, MouseButton } from '../constants';
import { InputBinding } from './input-binding';

export interface MouseBindArgs {
  moment: ButtonMoment;
  mouseButton: MouseButton;
}

export class MouseTriggerBinding extends InputBinding<MouseBindArgs> {
  public override matchesArgs(args: MouseBindArgs): boolean {
    return (
      this.args.moment === args.moment &&
      this.args.mouseButton === args.mouseButton
    );
  }

  override get displayText(): string {
    return `On "${this.args.mouseButton}" ${this.args.moment}`;
  }
}
