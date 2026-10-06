import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';
import {
  earliestSweepHit,
  findCircleTerrainSweepHits,
} from './circle-sweep-hits.js';

/**
 * Sweeps a circle whose center moves in a straight line from `start` to
 * `end` against a terrain-collider body, finding the first point at which they
 * touch.
 *
 * Like narrow-phase collision, the sweep only meets the terrain's surface
 * chain (see {@link TerrainSurfaceEdge}), and tests each of its edges on
 * its own: a circle already resting on one edge still finds the first edge
 * it would run into.
 *
 * A sweep that starts with the circle already touching a feature of the
 * target ignores that feature: there is no time of impact to find, and
 * narrow-phase collision already handles every contact that exists.
 * @param circle - The moving circle's collider, for its radius.
 * @param targetBody - The body to sweep against, in its world pose.
 * @param start - The circle's world center at the start of the sweep (see
 * `CircleCollider.getWorldCenter`).
 * @param end - The circle's world center at the end of the sweep.
 * @returns The first contact, or `null` if the circle doesn't touch the
 * target on the way from `start` to `end`.
 */
export function sweepCircleTerrain(
  circle: CircleCollider,
  targetBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): SweepHit | null {
  return earliestSweepHit(
    findCircleTerrainSweepHits(circle, targetBody, start, end),
  );
}
