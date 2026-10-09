import type { Quaternion } from './quaternion.js';
import type { Vector3 } from './vector3.js';

/**
 * The squared sine of the angle below which a look direction counts as
 * parallel to its up vector, so the up vector can't fix the roll.
 */
const parallelSineSquared = 1e-12;

/**
 * Whether a look direction is parallel to `up`, given the squared length of
 * their cross product (the look direction being unit length). Look
 * functions then use a fallback up vector.
 * @param crossLengthSquared - `|up × direction|²`.
 * @param up - The requested up vector.
 * @returns `true` if `up` can't fix the roll.
 */
export const isParallelToUp = (
  crossLengthSquared: number,
  up: Vector3,
): boolean =>
  crossLengthSquared <=
  parallelSineSquared * (up.x * up.x + up.y * up.y + up.z * up.z);

/**
 * Sets `out` to the unit quaternion of a rotation matrix given by its nine
 * elements (`mRC` is row `R`, column `C`), using Shepperd's method, which
 * picks the largest of `w`, `x`, `y` and `z` to divide by so the result
 * stays accurate for every rotation. The elements are passed as numbers so
 * that callers holding a basis in locals don't allocate a matrix.
 * @returns `out`.
 */
// eslint-disable-next-line max-params -- nine matrix elements, see above
export function setQuaternionFromRotation(
  out: Quaternion,
  m00: number,
  m11: number,
  m22: number,
  m10: number,
  m01: number,
  m20: number,
  m02: number,
  m21: number,
  m12: number,
): Quaternion {
  const trace = m00 + m11 + m22;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);

    out.x = (m21 - m12) * s;
    out.y = (m02 - m20) * s;
    out.z = (m10 - m01) * s;
    out.w = 0.25 / s;

    return out;
  }

  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);

    out.x = 0.25 * s;
    out.y = (m01 + m10) / s;
    out.z = (m02 + m20) / s;
    out.w = (m21 - m12) / s;

    return out;
  }

  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);

    out.x = (m01 + m10) / s;
    out.y = 0.25 * s;
    out.z = (m12 + m21) / s;
    out.w = (m02 - m20) / s;

    return out;
  }

  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);

  out.x = (m02 + m20) / s;
  out.y = (m12 + m21) / s;
  out.z = 0.25 * s;
  out.w = (m10 - m01) / s;

  return out;
}
