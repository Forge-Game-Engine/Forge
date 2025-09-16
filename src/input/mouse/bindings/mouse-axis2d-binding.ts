import { Axis2dAction } from '../../actions';
import { InputBinding } from '../../input-binding';

/** Mouse axis 2D input binding. */
export class MouseAxis2dBinding implements InputBinding<Axis2dAction> {
  public readonly action: Axis2dAction;
  public readonly displayText: string;

  /** Constructs a new MouseAxis2dBinding.
   * @param action - The action associated with this binding.
   */
  constructor(action: Axis2dAction) {
    this.action = action;
    this.displayText = 'mouse position';
  }
}
