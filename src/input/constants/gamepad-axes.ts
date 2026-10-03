/**
 * A mapping of human-readable axis names to their corresponding indices in
 * the W3C Standard Gamepad's `axes` array. `GamepadInputSource` reads the Y
 * axes with up as positive, flipping the W3C convention to match the rest of
 * the engine.
 * @see https://www.w3.org/TR/gamepad/#remapping
 */
export const gamepadAxes = {
  leftStickX: 0,
  leftStickY: 1,
  rightStickX: 2,
  rightStickY: 3,
} as const;

/** The index of an axis in a gamepad's `axes` array. */
export type GamepadAxisIndex = (typeof gamepadAxes)[keyof typeof gamepadAxes];
