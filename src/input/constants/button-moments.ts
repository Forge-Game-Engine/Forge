export const buttonMoments = {
  up: 'up',
  down: 'down',
} as const;

export type ButtonMoment = (typeof buttonMoments)[keyof typeof buttonMoments];
