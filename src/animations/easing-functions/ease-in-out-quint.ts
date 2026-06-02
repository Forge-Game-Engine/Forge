/**
 * Easing function for "easeInOutQuint".
 *
 * This function creates a smooth acceleration and deceleration effect.
 *
 * @param x - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link https://easings.net/#easeInOutQuint}
 */
export function easeInOutQuint(x: number): number {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}
