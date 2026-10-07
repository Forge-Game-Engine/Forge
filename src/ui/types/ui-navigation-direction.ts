/**
 * The four directions `createUiNavigationEcsSystem` can move focus in,
 * derived from each of a canvas's `navigateInput` presses (see
 * `Axis2dAction.presses`).
 */
export const uiNavigationDirections = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
} as const;

/** A value of {@link uiNavigationDirections}. */
export type UiNavigationDirection =
  (typeof uiNavigationDirections)[keyof typeof uiNavigationDirections];
