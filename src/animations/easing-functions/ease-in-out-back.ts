/**
 * Easing function for "easeInOutBack".
 *
 * This function accelerates from zero velocity, creating a "wind up" effect and overshoots the end value before returning to it.
 *
 * @param t - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link https://easings.net/#easeInOutBack}
 */
export function easeInOutBack(t: number): number {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;

  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}
