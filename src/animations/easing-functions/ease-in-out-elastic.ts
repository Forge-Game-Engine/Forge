/**
 * Easing function for "easeInOutElastic".
 *
 * This function creates an elastic effect that starts and ends with a bounce.
 *
 * @param t - The input value (typically between 0 and 1).
 * @returns The eased value.
 *
 * @see {@link https://easings.net/#easeInOutElastic}
 */
export function easeInOutElastic(x: number): number {
  const c5 = (2 * Math.PI) / 4.5;

  if (x === 0) {
    return 0;
  }

  if (x === 1) {
    return 1;
  }

  if (x < 0.5) {
    return -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2;
  }

  return (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2;
}
