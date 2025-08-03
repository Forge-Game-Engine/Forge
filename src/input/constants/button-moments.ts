export const buttonMoments = {
  up: 'up',
  down: 'down',
  //hold: 'hold',
} as const;

export type ButtonMoment = (typeof buttonMoments)[keyof typeof buttonMoments];
