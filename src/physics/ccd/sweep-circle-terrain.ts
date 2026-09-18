import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';
import { sweepCircleAgainstConvexShape } from './sweep-circle-polygon.js';

/**
 * The local-space x-range a swept circle's path could possibly reach a
 * terrain segment within, inflated by `radius` on both ends - mirroring how
 * `detectCircleTerrainCollision`'s `findSurfaceContact` inflates a
 * (stationary) circle's own x-extent by its radius before comparing against
 * a segment's `minX`/`maxX`.
 */
function localSweptXRange(
  start: Vector2,
  end: Vector2,
  radius: number,
  terrainBody: CollisionBody,
): { minX: number; maxX: number } {
  // Clone before subtracting: `start`/`end` are the caller's own sweep
  // trajectory points, so this must not mutate them.
  const localStart = Vec2.rotate(
    Vec2.subtract(Vec2.clone(start), terrainBody.position),
    -terrainBody.rotation,
  );
  const localEnd = Vec2.rotate(
    Vec2.subtract(Vec2.clone(end), terrainBody.position),
    -terrainBody.rotation,
  );

  return {
    minX: Math.min(localStart.x, localEnd.x) - radius,
    maxX: Math.max(localStart.x, localEnd.x) + radius,
  };
}

/**
 * Sweeps a circle from `startPosition` to `endPosition` against a static
 * terrain-collider body, by running {@link sweepCircleAgainstConvexShape}
 * against each of the terrain's segments whose local x-range the swept
 * circle could possibly reach, keeping the earliest resulting time of
 * impact (TOI) - mirroring `raycastTerrain`'s own segment-scan structure,
 * including its fixed, ascending-segment-index iteration order.
 * @param circleBody - The moving body; only its {@link CircleCollider} (for
 * `radius`/`offset`) is used - `startPosition`/`endPosition` give the
 * swept trajectory, not `circleBody.position`.
 * @param terrainBody - The static body with a {@link TerrainCollider} being
 * swept against.
 * @param startPosition - The circle's world-space position at the start of
 * the swept translation (before `circleBody.collider`'s `offset` is
 * applied).
 * @param endPosition - The circle's world-space position at the end of the
 * swept translation (before `circleBody.collider`'s `offset` is applied).
 * @returns The earliest {@link SweepHit}, or `null` if the circle never
 * touches the terrain along the swept translation. A `t` of `0` means the
 * circle already overlaps the terrain at `startPosition`.
 */
export function sweepCircleTerrain(
  circleBody: CollisionBody,
  terrainBody: CollisionBody,
  startPosition: Vector2,
  endPosition: Vector2,
): SweepHit | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { radius } = circleCollider;

  // Clone before adding: `startPosition`/`endPosition` are the caller's own
  // trajectory points, so this must not mutate them.
  const sweepStart = Vec2.add(Vec2.clone(startPosition), circleCollider.offset);
  const sweepEnd = Vec2.add(Vec2.clone(endPosition), circleCollider.offset);
  const { minX, maxX } = localSweptXRange(
    sweepStart,
    sweepEnd,
    radius,
    terrainBody,
  );

  let closest: SweepHit | null = null;

  for (const segment of terrainCollider.segments) {
    if (maxX < segment.minX || minX > segment.maxX) {
      continue;
    }

    // Clone before rotating: `segment.vertices`/`segment.normals` are the
    // terrain collider's own persistent local-space segment data (its
    // surface vertices alias `terrainCollider.points` directly), reused
    // every tick.
    const vertices = segment.vertices.map((vertex) =>
      Vec2.add(
        Vec2.rotate(Vec2.clone(vertex), terrainBody.rotation),
        terrainBody.position,
      ),
    );
    const normals = segment.normals.map((normal) =>
      Vec2.rotate(Vec2.clone(normal), terrainBody.rotation),
    );

    const hit = sweepCircleAgainstConvexShape(
      vertices,
      normals,
      radius,
      sweepStart,
      sweepEnd,
    );

    if (hit !== null && (closest === null || hit.t < closest.t)) {
      closest = hit;
    }
  }

  return closest;
}
