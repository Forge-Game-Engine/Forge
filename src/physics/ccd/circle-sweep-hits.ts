import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  TerrainCollider,
  TerrainSurfaceEdge,
} from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';

/**
 * Finds every point at which a circle moving in a straight line from
 * `start` to `end` first touches one feature (a face or a vertex) of a
 * target collider. Each feature contributes at most one hit.
 */
export type CircleSweepHitsFinder = (
  circle: CircleCollider,
  targetBody: CollisionBody,
  start: Vector2,
  end: Vector2,
) => SweepHit[];

/**
 * A circle's center moving in a straight line over a sweep: at `start`
 * when `t` is `0`, and at `start + translation` when `t` is `1`.
 */
interface SweptCircle {
  start: Vector2;
  translation: Vector2;
  radius: number;
}

function createSweptCircle(
  circle: CircleCollider,
  start: Vector2,
  end: Vector2,
): SweptCircle {
  // Clone before adding: `start`/`end` are the caller's own positions.
  const startCenter = Vec2.add(Vec2.clone(start), circle.offset);
  const endCenter = Vec2.add(Vec2.clone(end), circle.offset);

  return {
    start: startCenter,
    translation: Vec2.subtract(endCenter, startCenter),
    radius: circle.radius,
  };
}

function centerAt(swept: SweptCircle, t: number): Vector2 {
  return Vec2.add(Vec2.multiply(Vec2.clone(swept.translation), t), swept.start);
}

/**
 * Sweeps a circle against one face of a shape: the segment from `faceStart`
 * to `faceEnd`, pushed out along its own outward `normal` by the circle's
 * radius (one side of the shape's Minkowski sum with the circle).
 *
 * Only a circle approaching the face from in front of it counts. One that
 * starts already touching or behind the face is left to narrow-phase
 * collision, which handles every contact that already exists.
 * @returns The hit, or `null` if the circle doesn't reach the face's span
 * during the sweep.
 */
function sweepFace(
  swept: SweptCircle,
  faceStart: Vector2,
  faceEnd: Vector2,
  normal: Vector2,
): SweepHit | null {
  const approach = Vec2.dot(swept.translation, normal);

  if (approach >= 0) {
    return null;
  }

  // Clone before subtracting: `swept.start` is reused for every feature.
  const separation =
    Vec2.dot(Vec2.subtract(Vec2.clone(swept.start), faceStart), normal) -
    swept.radius;

  if (separation < 0) {
    return null;
  }

  const t = separation / -approach;

  if (t > 1) {
    return null;
  }

  const contactCenter = centerAt(swept, t);
  // Clone before subtracting: `faceStart`/`faceEnd` are the shape's own
  // vertices.
  const face = Vec2.subtract(Vec2.clone(faceEnd), faceStart);
  const projection =
    Vec2.dot(Vec2.subtract(Vec2.clone(contactCenter), faceStart), face) /
    Vec2.magnitudeSquared(face);

  if (projection < 0 || projection > 1) {
    return null;
  }

  return {
    point: Vec2.subtract(
      contactCenter,
      Vec2.multiply(Vec2.clone(normal), swept.radius),
    ),
    normal: Vec2.clone(normal),
    t,
  };
}

/**
 * Sweeps a circle against a round feature: a circle of `reach` around
 * `vertex`, where `reach` is the moving circle's radius plus the feature's
 * own (`0` for a polygon's corner, the target's radius for a circle).
 *
 * A polygon's corner only owns the part of that round where the circle
 * touches the corner itself rather than one of the faces meeting there:
 * the contact normal must point past the end of the face coming into the
 * corner (`incoming`) and before the start of the face leaving it
 * (`outgoing`). Testing the whole round would report hits from inside the
 * shape's Minkowski sum.
 * @returns The hit, or `null` if the circle doesn't reach the feature
 * during the sweep, starts already touching it, or touches it outside the
 * corner's own part.
 */
function sweepRound(
  swept: SweptCircle,
  vertex: Vector2,
  reach: number,
  incoming: Vector2 | null,
  outgoing: Vector2 | null,
): SweepHit | null {
  const a = Vec2.dot(swept.translation, swept.translation);
  // Clone before subtracting: `swept.start` is reused for every feature.
  const fromVertex = Vec2.subtract(Vec2.clone(swept.start), vertex);
  const b = 2 * Vec2.dot(fromVertex, swept.translation);
  const c = Vec2.dot(fromVertex, fromVertex) - reach * reach;

  if (a === 0 || c < 0 || b >= 0) {
    return null;
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);

  if (t > 1) {
    return null;
  }

  const normal = Vec2.normalize(Vec2.subtract(centerAt(swept, t), vertex));

  if (incoming !== null && Vec2.dot(normal, incoming) < 0) {
    return null;
  }

  if (outgoing !== null && Vec2.dot(normal, outgoing) > 0) {
    return null;
  }

  return {
    point: Vec2.add(
      Vec2.multiply(Vec2.clone(normal), reach - swept.radius),
      vertex,
    ),
    normal,
    t,
  };
}

function pushHit(hits: SweepHit[], hit: SweepHit | null): void {
  if (hit !== null) {
    hits.push(hit);
  }
}

/**
 * Finds where a moving circle first touches a circle-collider body.
 */
export const findCircleCircleSweepHits: CircleSweepHitsFinder = (
  circle,
  targetBody,
  start,
  end,
) => {
  const target = targetBody.collider as CircleCollider;
  // Clone before adding: `targetBody.position` is the entity's live world
  // position.
  const targetCenter = Vec2.add(Vec2.clone(targetBody.position), target.offset);
  const hits: SweepHit[] = [];

  pushHit(
    hits,
    sweepRound(
      createSweptCircle(circle, start, end),
      targetCenter,
      circle.radius + target.radius,
      null,
      null,
    ),
  );

  return hits;
};

/**
 * Finds where a moving circle first touches each face and corner of a
 * polygon-collider body.
 */
export const findCirclePolygonSweepHits: CircleSweepHitsFinder = (
  circle,
  targetBody,
  start,
  end,
) => {
  const polygon = targetBody.collider as PolygonCollider;
  const vertices = polygon.getWorldVertices(
    targetBody.position,
    targetBody.rotation,
  );
  const normals = polygon.getWorldNormals(targetBody.rotation);
  const swept = createSweptCircle(circle, start, end);
  const hits: SweepHit[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const previous = vertices[(i - 1 + vertices.length) % vertices.length];
    const vertex = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    pushHit(hits, sweepFace(swept, vertex, next, normals[i]));
    pushHit(
      hits,
      sweepRound(
        swept,
        vertex,
        circle.radius,
        Vec2.subtract(Vec2.clone(vertex), previous),
        Vec2.subtract(Vec2.clone(next), vertex),
      ),
    );
  }

  return hits;
};

function edgeDirection(edge: TerrainSurfaceEdge): Vector2 {
  // Clone before subtracting: `edge.end` is the collider's own stored point.
  return Vec2.subtract(Vec2.clone(edge.end), edge.start);
}

function toTerrainLocal(point: Vector2, terrainBody: CollisionBody): Vector2 {
  // Clone before subtracting: `point` is the caller's own vector.
  return Vec2.rotate(
    Vec2.subtract(Vec2.clone(point), terrainBody.position),
    -terrainBody.rotation,
  );
}

/**
 * Finds where a moving circle first touches each edge and corner of a
 * terrain-collider body's surface chain.
 *
 * Like narrow-phase collision, the sweep only meets the terrain's surface
 * (see {@link TerrainSurfaceEdge}), never the sides of the solid columns
 * beneath it. A circle rolling quickly along the ground would otherwise
 * catch on the top corner of every column it moves onto. Corners only
 * exist where the surface bends away from the circle; where it bends
 * toward the circle, the two edges' faces already meet.
 */
export const findCircleTerrainSweepHits: CircleSweepHitsFinder = (
  circle,
  targetBody,
  start,
  end,
) => {
  const terrain = targetBody.collider as TerrainCollider;
  const { surface } = terrain;
  const swept = createSweptCircle(
    circle,
    toTerrainLocal(start, targetBody),
    toTerrainLocal(end, targetBody),
  );
  const sweptEnd = centerAt(swept, 1);
  const minX = Math.min(swept.start.x, sweptEnd.x) - circle.radius;
  const maxX = Math.max(swept.start.x, sweptEnd.x) + circle.radius;
  const hits: SweepHit[] = [];

  for (let i = 0; i < surface.length; i++) {
    const edge = surface[i];

    if (maxX < edge.start.x || minX > edge.end.x) {
      continue;
    }

    const direction = edgeDirection(edge);
    const previous = i > 0 ? surface[i - 1] : null;

    pushHit(hits, sweepFace(swept, edge.start, edge.end, edge.normal));

    // Each edge owns the corner at its start; the last edge also owns the
    // corner at the chain's end.
    if (previous === null || Vec2.dot(direction, previous.normal) < 0) {
      pushHit(
        hits,
        sweepRound(
          swept,
          edge.start,
          circle.radius,
          previous === null ? null : edgeDirection(previous),
          direction,
        ),
      );
    }

    if (i === surface.length - 1) {
      pushHit(
        hits,
        sweepRound(swept, edge.end, circle.radius, direction, null),
      );
    }
  }

  // The hits are fresh vectors, so transforming them in place is safe.
  return hits.map((hit) => ({
    point: Vec2.add(
      Vec2.rotate(hit.point, targetBody.rotation),
      targetBody.position,
    ),
    normal: Vec2.rotate(hit.normal, targetBody.rotation),
    t: hit.t,
  }));
};

/**
 * The sweep-hit finder for a moving circle against each kind of collider.
 */
export const circleSweepHitFinders: Record<
  Collider['type'],
  CircleSweepHitsFinder
> = {
  circle: findCircleCircleSweepHits,
  polygon: findCirclePolygonSweepHits,
  terrain: findCircleTerrainSweepHits,
};

/**
 * Picks the hit the moving shape reaches first.
 * @param hits - The hits to choose from.
 * @returns The hit with the smallest `t`, or `null` if `hits` is empty.
 */
export function earliestSweepHit(hits: readonly SweepHit[]): SweepHit | null {
  let earliest: SweepHit | null = null;

  for (const hit of hits) {
    if (earliest === null || hit.t < earliest.t) {
      earliest = hit;
    }
  }

  return earliest;
}
