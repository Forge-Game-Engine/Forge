/**
 * Easing function for "easeOutBack".
 *
 * Decelerates toward the end value with a brief overshoot, then settles.
 * Ideal for "pop in" entrance animations where an element grows past its
 * target size before settling.
 *
 * @param t - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link http://easings.net/#easeOutBack}
 */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
