/** Defines the moments of a button press. */
export const buttonMoments = {
  /** The button was just released. */
  up: 'up',
  /** The button was just pressed down. */
  down: 'down',
} as const;

/** The type of button moment. */
export type ButtonMoment = (typeof buttonMoments)[keyof typeof buttonMoments];
