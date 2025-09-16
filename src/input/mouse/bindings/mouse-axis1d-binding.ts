import { Axis1dAction } from '../../actions';
import { InputBinding } from '../../input-binding';

/** Mouse axis 1D input binding. */
export class MouseAxis1dBinding implements InputBinding<Axis1dAction> {
  public readonly action: Axis1dAction;
  public readonly displayText: string;

  /** Constructs a new MouseAxis1dBinding.
   * @param action - The action associated with this binding.
   */
  constructor(action: Axis1dAction) {
    this.action = action;
    this.displayText = 'mouse scroll';
  }
}
