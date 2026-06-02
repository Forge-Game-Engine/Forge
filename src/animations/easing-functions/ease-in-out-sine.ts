/**
 * Easing function for "easeInOutSine".
 *
 * This function creates a smooth sine wave-like acceleration and deceleration.
 *
 * @param x - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link https://easings.net/#easeInOutSine}
 */
export function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
