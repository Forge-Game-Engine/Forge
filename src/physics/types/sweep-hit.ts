import { Vector2 } from '../../math/index.js';

/**
 * The first contact between a moving shape and a target collider, as found
 * by a sweep (see {@link sweepCirclePolygon}).
 */
export interface SweepHit {
  /**
   * The world-space point on the target's surface the moving shape first
   * touches.
   */
  point: Vector2;

  /**
   * The target's outward-facing surface normal at `point`, in world space.
   */
  normal: Vector2;

  /**
   * How far along the sweep, from `0` (its start) to `1` (its end), the
   * moving shape first touches the target.
   */
  t: number;
}
