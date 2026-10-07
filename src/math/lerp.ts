/**
 * Performs linear interpolation between two values.
 *
 * @param v0 - The start value.
 * @param v1 - The end value.
 * @param t - The interpolation factor: `0` returns `v0` and `1` returns `v1`.
 * It isn't clamped, so values outside `[0, 1]` extrapolate past `v0` or `v1`.
 * @returns The interpolated value.
 */
export function lerp(v0: number, v1: number, t: number): number {
  return v0 + t * (v1 - v0);
}
