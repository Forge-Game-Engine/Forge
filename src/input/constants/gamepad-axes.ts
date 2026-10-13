/**
 * A mapping of human-readable axis names to their corresponding indices in
 * the W3C Standard Gamepad's `axes` array. A stick's Y axis reads up as
 * negative, matching the engine's Y-down world.
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
