import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';
import {
  earliestSweepHit,
  findCircleChainSweepHits,
} from './circle-sweep-hits.js';

/**
 * Sweeps a circle whose center moves in a straight line from `start` to
 * `end` against a chain-collider body, finding the first point at which they
 * touch.
 *
 * Like narrow-phase collision, the sweep only meets the chain's edges (see
 * {@link ChainEdge}) from the side their outward normals face, and only
 * the edges near the circle's path are tested: a fast circle is stopped at
 * the near face of a wall however thin the wall is.
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
export function sweepCircleChain(
  circle: CircleCollider,
  targetBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): SweepHit | null {
  return earliestSweepHit(
    findCircleChainSweepHits(circle, targetBody, start, end),
  );
}
