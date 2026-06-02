/**
 * Easing function for "linear".
 *
 * This function creates a linear easing effect, where the rate of change is constant.
 *
 * @param t - The input value (typically between 0 and 1).
 * @returns The eased value, which is the same as the input value.
 */
export function linear(t: number): number {
  return t;
}
