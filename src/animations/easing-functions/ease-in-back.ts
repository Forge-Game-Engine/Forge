/**
 * Easing function for "easeInBack".
 *
 * This function accelerates from zero velocity, creating a "wind up" effect.
 *
 * @param t - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link http://easings.net/#easeInBack}
 */
export function easeInBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return c3 * t * t * t - c1 * t * t;
}
