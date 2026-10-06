import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';
import {
  earliestSweepHit,
  findCirclePolygonSweepHits,
} from './circle-sweep-hits.js';

/**
 * Sweeps a circle moving in a straight line from `start` to `end` against
 * a polygon-collider body, finding the first point at which they touch.
 *
 * A sweep that starts with the circle already touching a feature of the
 * target ignores that feature: there is no time of impact to find, and
 * narrow-phase collision already handles every contact that exists.
 * @param circle - The moving circle's collider. Its center is `start`/`end`
 * plus its `offset`, as in narrow-phase collision.
 * @param targetBody - The body to sweep against, in its world pose.
 * @param start - The moving body's world position at the start of the sweep.
 * @param end - The moving body's world position at the end of the sweep.
 * @returns The first contact, or `null` if the circle doesn't touch the
 * target on the way from `start` to `end`.
 */
export function sweepCirclePolygon(
  circle: CircleCollider,
  targetBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): SweepHit | null {
  return earliestSweepHit(
    findCirclePolygonSweepHits(circle, targetBody, start, end),
  );
}
