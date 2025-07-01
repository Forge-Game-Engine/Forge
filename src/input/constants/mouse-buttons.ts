export type MouseButton = (typeof mouseButtons)[keyof typeof mouseButtons];

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
export const mouseButtons = {
  left: 0,
  middle: 1,
  right: 2,
  extra1: 3,
  extra2: 4,
} as const;
