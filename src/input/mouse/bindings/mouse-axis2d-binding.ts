import { Vector2 } from 'forge/math';
import { Axis2dAction } from 'forge/input/actions';
import { CursorValueType, cursorValueTypes } from 'forge/input/constants';
import { InputBinding } from 'forge/input/input-binding';

/** Options for the MouseAxis2dBinding. */
interface MouseAxis2dBindingOptions {
  /** The type of cursor value. Default is ratio. */
  cursorValueType?: CursorValueType;
  /** The origin point for cursor measurements between [0..1] starting at the top-left. Default is center (0.5, 0.5). */
  cursorOrigin?: Vector2;
}

const defaultMouseAxis2dBindingOptions = {
  cursorValueType: cursorValueTypes.ratio,
  cursorOrigin: new Vector2(0.5, 0.5),
};

/** Mouse axis 2D input binding. */
export class MouseAxis2dBinding implements InputBinding<Axis2dAction> {
  public readonly action: Axis2dAction;
  public readonly displayText: string;
  public readonly cursorValueType: CursorValueType;
  public readonly cursorOrigin: Vector2;

  /** Constructs a new MouseAxis2dBinding.
   * @param action - The action associated with this binding.
   */
  constructor(action: Axis2dAction, options?: MouseAxis2dBindingOptions) {
    this.action = action;
    this.displayText = 'mouse position';

    const { cursorValueType, cursorOrigin } = {
      ...defaultMouseAxis2dBindingOptions,
      ...options,
    };

    this.cursorValueType = cursorValueType;
    this.cursorOrigin = cursorOrigin;
  }
}
