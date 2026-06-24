/**
 * A mapping of human-readable button names to their corresponding indices
 * in the W3C Standard Gamepad's `buttons` array.
 * @see https://www.w3.org/TR/gamepad/#remapping
 */
export const gamepadButtons = {
  faceButtonBottom: 0,
  faceButtonRight: 1,
  faceButtonLeft: 2,
  faceButtonTop: 3,
  leftShoulder: 4,
  rightShoulder: 5,
  leftTrigger: 6,
  rightTrigger: 7,
  select: 8,
  start: 9,
  leftStick: 10,
  rightStick: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16,
} as const;

/** The index of a button in a gamepad's `buttons` array. */
export type GamepadButtonIndex =
  (typeof gamepadButtons)[keyof typeof gamepadButtons];
