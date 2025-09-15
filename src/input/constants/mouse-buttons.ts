// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
export const mouseButtons = {
  left: 0,
  middle: 1,
  right: 2,
  extra1: 3,
  extra2: 4,
} as const;

export type MouseButton = (typeof mouseButtons)[keyof typeof mouseButtons];

export function getMouseButtonName(button: MouseButton): string {
  const name = (
    Object.keys(mouseButtons) as Array<keyof typeof mouseButtons>
  ).find((key) => mouseButtons[key] === button) as string;

  return name;
}
