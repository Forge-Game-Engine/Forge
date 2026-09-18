import { Vector2 } from '../../math/index.js';

/**
 * The first point of contact found by sweeping a moving circle along a
 * straight path against a target shape, as returned by
 * `sweepCirclePolygon`/`sweepCircleTerrain`/`sweepCircleCircle`.
 */
export interface SweepHit {
  /**
   * The world-space point of first contact, on the surface of the target
   * shape.
   */
  point: Vector2;

  /**
   * The target shape's outward-facing surface normal at `point`, in world
   * space.
   */
  normal: Vector2;

  /**
   * The fraction, in `[0, 1]`, of the swept translation (from the sweep's
   * start position to its end position) completed at first contact. `0`
   * means the circle already overlaps the target shape at the start
   * position.
   */
  t: number;
}
