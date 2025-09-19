import { Axis2dAction } from '../../actions';
import { CursorValueType, cursorValueTypes } from '../../constants';
import { InputBinding } from '../../input-binding';

export /** Mouse axis 2D input binding. */
class MouseAxis2dBinding implements InputBinding<Axis2dAction> {
  public readonly action: Axis2dAction;
  public readonly displayText: string;
  public readonly cursorValueType: CursorValueType;

  /** Constructs a new MouseAxis2dBinding.
   * @param action - The action associated with this binding.
   */
  constructor(
    action: Axis2dAction,
    cursorValueType: CursorValueType = cursorValueTypes.centerSpaceRatio,
  ) {
    this.action = action;
    this.displayText = 'mouse position';
    this.cursorValueType = cursorValueType;
  }
}
