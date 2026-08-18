import { Vector2 } from '../../math/index.js';
import { MouseButton } from '../constants/index.js';
import { InputSource } from '../input-source.js';

/**
 * Represents a source of canvas-space pointer state: position, buttons,
 * movement delta, and scroll. `MouseInputSource` implements this today; a
 * future touch input source could become a second implementation feeding
 * the same `PointerEcsComponent` through `createPointerEcsSystem`, with
 * nothing above it needing to change.
 */
export interface PointerInputSource extends InputSource {
  /**
   * The pointer's current position in canvas pixels: Y-down, origin at the
   * canvas's top-left corner.
   */
  readonly position: Vector2;

  /** How far `position` moved since the last tick, in canvas pixels. */
  readonly delta: Vector2;

  /**
   * Accumulated wheel scroll delta (`WheelEvent.deltaY`) since the last
   * tick.
   */
  readonly scroll: number;

  /** Buttons that started being held down since the last tick. */
  readonly buttonsDown: ReadonlySet<MouseButton>;

  /** Buttons currently held down. */
  readonly buttonsHeld: ReadonlySet<MouseButton>;

  /** Buttons that stopped being held down since the last tick. */
  readonly buttonsUp: ReadonlySet<MouseButton>;
}
