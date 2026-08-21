/**
 * The four directions `createUiNavigationEcsSystem` can move focus in,
 * derived from a canvas's `navigateInput` each time its magnitude crosses
 * `navigationThreshold`.
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
