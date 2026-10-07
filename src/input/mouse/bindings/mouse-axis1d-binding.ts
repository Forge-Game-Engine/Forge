import { Axis1dAction } from '../../actions/index.js';
import { InputBinding } from '../../input-binding.js';

/**
 * Mouse axis 1D input binding for the scroll wheel. Sets its action to the
 * sum of `WheelEvent.deltaY / 100` over the frame's `wheel` events, and
 * back to `0` when the `InputManager` resets at the end of the frame.
 */
export class MouseAxis1dBinding implements InputBinding<Axis1dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis1dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;

  /** Constructs a new MouseAxis1dBinding.
   * @param action - The action associated with this binding.
   */
  constructor(action: Axis1dAction) {
    this.action = action;
    this.displayText = 'mouse scroll';
  }
}
