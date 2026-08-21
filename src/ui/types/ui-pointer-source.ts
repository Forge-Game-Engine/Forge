import { Vector2 } from '../../math/index.js';

/**
 * The shape `createUiRaycastEcsSystem`/`createUiInteractionEcsSystem` need
 * from a pointer device to hit-test and drive hover/press/drag. A plain
 * structural interface rather than a dependency on `MouseInputSource`
 * specifically, so the UI module never hard-codes "the pointer is a mouse" -
 * a touchscreen, a stylus, or any other pointing device can drive the same
 * systems by exposing this same shape, and a game that's gamepad/keyboard-only
 * (via `submitInput`/`navigateInput` on `createUiCanvas`) never needs one at
 * all. `MouseInputSource` already satisfies this without any changes.
 */
export interface UiPointerSource {
  /** The pointer's current position, in canvas pixels, Y-down. */
  readonly position: Vector2;

  /** Button codes that started being held down since the last reset. */
  readonly buttonsDown: ReadonlySet<number>;

  /** Button codes that stopped being held down since the last reset. */
  readonly buttonsUp: ReadonlySet<number>;
}
