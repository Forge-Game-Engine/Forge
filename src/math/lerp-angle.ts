const fullTurn = Math.PI * 2;

/**
 * Interpolates between two angles along the shorter way around the circle,
 * like Godot's `lerp_angle`. Angles are in radians, in Forge's convention
 * (`0` along `+X`, positive turning `+X` towards `+Y`).
 *
 * The result continues from `from` rather than being wrapped, so an angle
 * that has wound past a whole turn stays near its own values.
 * @param from - The start angle.
 * @param to - The end angle.
 * @param t - The interpolation factor: `0` returns `from`, `1` returns an
 * angle that points the same way as `to` (it can differ from `to` by whole
 * turns). It isn't clamped.
 * @returns `from` plus `t` times the signed difference from `from` to `to`,
 * wrapped into `[-π, π)`.
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const difference =
    ((((to - from + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;

  return from + difference * t;
}
