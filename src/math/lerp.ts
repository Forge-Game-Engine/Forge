/**
 * Performs linear interpolation between two values.
 *
 * @param v0 - The start value.
 * @param v1 - The end value.
 * @param t - The interpolation factor, typically between 0 and 1.
 * @returns The interpolated value.
 */
export function lerp(v0: number, v1: number, t: number): number {
  return v0 + t * (v1 - v0);
}
