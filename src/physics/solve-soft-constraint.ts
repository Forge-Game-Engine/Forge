/**
 * The coefficients {@link getSoftConstraintParams} derives for a single
 * solve of a soft (mass-spring-damper) constraint.
 */
export interface SoftConstraintParams {
  /**
   * The rate at which positional error is fed into the velocity solve as a
   * bias.
   */
  biasRate: number;

  /**
   * Scales the velocity error term of the solve.
   */
  massScale: number;

  /**
   * Scales how much of the constraint's previously accumulated impulse is
   * subtracted back out of this solve.
   */
  impulseScale: number;
}

/**
 * Derives soft-constraint solver coefficients from a target frequency and
 * damping ratio, letting a constraint (e.g. a contact) correct its
 * positional error smoothly over several ticks through the velocity solve,
 * rather than snapping it back in one step (as Baumgarte stabilization
 * does) or ignoring it entirely.
 * @param hertz - The constraint's natural frequency, in Hz. `0` disables
 * positional correction entirely (`massScale`/`impulseScale` become `0`).
 * @param dampingRatio - The constraint's damping ratio (`1` is critically
 * damped).
 * @param timeStep - The solver's timestep, in seconds.
 * @returns The `biasRate`, `massScale`, and `impulseScale` coefficients for
 * this solve.
 */
export function getSoftConstraintParams(
  hertz: number,
  dampingRatio: number,
  timeStep: number,
): SoftConstraintParams {
  if (hertz === 0) {
    return { biasRate: 0, massScale: 0, impulseScale: 0 };
  }

  const omega = 2 * Math.PI * hertz;
  const a1 = 2 * dampingRatio + timeStep * omega;
  const a2 = timeStep * omega * a1;
  const a3 = 1 / (1 + a2);

  return {
    biasRate: omega / a1,
    massScale: a2 * a3,
    impulseScale: a3,
  };
}
