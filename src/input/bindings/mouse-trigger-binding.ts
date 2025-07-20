import { ButtonMoment, MouseButton } from '../constants';
import { InputBinding } from './input-binding';

export interface MouseTriggerBindArgs {
  moment: ButtonMoment;
  mouseButton: MouseButton;
}

export class MouseTriggerBinding extends InputBinding<MouseTriggerBindArgs> {
  public override matchesArgs(args: MouseTriggerBindArgs): boolean {
    return (
      this.args.moment === args.moment &&
      this.args.mouseButton === args.mouseButton
    );
  }

  override get displayText(): string {
    return `On "${this.args.mouseButton}" ${this.args.moment}`;
  }
}
