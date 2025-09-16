/**
 * Defines the mouse buttons available for input.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
 */
export const mouseButtons = {
  left: 0,
  middle: 1,
  right: 2,
  extra1: 3,
  extra2: 4,
} as const;

/** The type of mouse button. */
export type MouseButton = (typeof mouseButtons)[keyof typeof mouseButtons];

/** Gets the name of a mouse button given its numeric value.
 * @param button - The numeric value of the mouse button.
 * @returns The name of the mouse button.
 */
export function getMouseButtonName(button: MouseButton): string {
  const name = (
    Object.keys(mouseButtons) as Array<keyof typeof mouseButtons>
  ).find((key) => mouseButtons[key] === button) as string;

  return name;
}
