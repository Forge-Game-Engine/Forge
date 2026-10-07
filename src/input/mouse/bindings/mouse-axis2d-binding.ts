import { Vector2 } from '../../../math/index.js';
import { Axis2dAction } from '../../actions/index.js';
import { CursorValueType, cursorValueTypes } from '../../constants/index.js';
import { InputBinding } from '../../input-binding.js';

/** Options for the MouseAxis2dBinding. */
interface MouseAxis2dBindingOptions {
  /** How the cursor's position is measured. Defaults to `cursorValueTypes.ratio`. */
  cursorValueType?: CursorValueType;
  /**
   * The point the cursor's position is measured from, as a fraction of the
   * container's width and height from its top-left corner. Defaults to
   * `(0.5, 0.5)`, the center.
   */
  cursorOrigin?: Vector2;
}

const defaultMouseAxis2dBindingOptions = {
  cursorValueType: cursorValueTypes.ratio,
  cursorOrigin: { x: 0.5, y: 0.5 },
};

/**
 * Mouse axis 2D input binding. Sets its action to the cursor's position on
 * every `mousemove`, measured from `cursorOrigin` with `y` increasing
 * downward.
 */
export class MouseAxis2dBinding implements InputBinding<Axis2dAction> {
  /** The action associated with this binding. */
  public readonly action: Axis2dAction;
  /** A human-readable description of this binding. */
  public readonly displayText: string;
  /** How the cursor's position is measured. Defaults to `cursorValueTypes.ratio`. */
  public readonly cursorValueType: CursorValueType;
  /**
   * The point the cursor's position is measured from, as a fraction of the
   * container's width and height from its top-left corner. Defaults to
   * `(0.5, 0.5)`, the center.
   */
  public readonly cursorOrigin: Vector2;

  /** Constructs a new MouseAxis2dBinding.
   * @param action - The action associated with this binding.
   * @param options - How the cursor's position is measured.
   * @param options.cursorValueType - Ratio of the container's size (the default) or CSS pixels.
   * @param options.cursorOrigin - The point positions are measured from, as a fraction of the container's size. Defaults to the center.
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
