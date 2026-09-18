import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  findCircleContact,
  findClosestFace,
} from '../collision/circle-polygon-contact.js';
import { raycastCircle } from '../raycast/raycast-circle.js';
import { raycastConvexPolygon } from '../raycast/raycast-convex-polygon.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';

/**
 * Finds the earliest point along `start`-`end` where the moving point first
 * crosses any of the polygon's edges translated outward by `radius` along
 * its own normal - the straight-edge part of the circle's Minkowski sum
 * with the polygon; the rounded corners are {@link nearestVertexHit}'s job.
 * Each edge is tested as its own independent finite segment (rather than
 * connecting adjacent inflated edges into a single closed loop, which would
 * need an extra "connector" edge per corner): at an exact corner crossing -
 * a swept path that happens to line up precisely with one of the polygon's
 * own vertices - a connector edge's own endpoints exactly tie the real
 * edge's and the corner's own rounding circle in *distance*, and picking a
 * winner among same-distance candidates by an inequality comparison alone
 * is exactly the kind of tie a hair of floating-point noise can flip (see
 * `DEPTH_TIE_TOLERANCE` in `detect-circle-terrain-collision.ts` for the
 * same class of issue) - a connector edge that wins such a tie reports a
 * wrong (averaged, not radial) normal, whereas a tie between the real edge
 * and the corner's own rounding circle can never be wrong, since both
 * report the same correct point/normal there. Testing only real edges
 * removes the wrong-normal outcome entirely, rather than trying to out-run
 * the tie.
 */
function nearestInflatedEdgeHit(
  vertices: readonly Vector2[],
  normals: readonly Vector2[],
  radius: number,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const vertexCount = vertices.length;
  let closest: RaycastShapeHit | null = null;

  for (let i = 0; i < vertexCount; i++) {
    const normal = normals[i];
    const nextIndex = (i + 1) % vertexCount;
    const offset = Vec2.multiply(Vec2.clone(normal), radius);
    const edgeStart = Vec2.add(Vec2.clone(offset), vertices[i]);
    const edgeEnd = Vec2.add(offset, vertices[nextIndex]);

    const hit = raycastConvexPolygon(
      [edgeStart, edgeEnd],
      [normal, normal],
      start,
      end,
    );

    if (hit !== null && (closest === null || hit.distance < closest.distance)) {
      closest = hit;
    }
  }

  return closest;
}

/**
 * A sweep test's hit, expressed in terms of how far the moving circle's
 * *center* traveled before first touching the target - the contact point
 * on the target's own surface is a further `radius` back from that, along
 * the (already outward-facing) `normal`.
 */
interface CenterTravelHit {
  centerAtContact: Vector2;
  normal: Vector2;
  distance: number;
}

/**
 * Picks whichever of two (possibly absent) {@link CenterTravelHit}s
 * traveled the shorter distance before contact.
 */
function closerHit(
  a: CenterTravelHit | null,
  b: CenterTravelHit | null,
): CenterTravelHit | null {
  if (a === null) {
    return b;
  }

  if (b === null) {
    return a;
  }

  return b.distance < a.distance ? b : a;
}

function toSweepHit(
  hit: CenterTravelHit,
  radius: number,
  totalDistance: number,
): SweepHit {
  return {
    // `hit.centerAtContact` is a fresh point (see the two call sites
    // below), so subtracting in place is safe.
    point: Vec2.subtract(
      hit.centerAtContact,
      Vec2.multiply(Vec2.clone(hit.normal), radius),
    ),
    normal: hit.normal,
    t: Math.min(1, Math.max(0, hit.distance / totalDistance)),
  };
}

/**
 * Finds the earliest point along `start`-`end` where a disk of `radius`
 * centered on the moving point first touches any of `vertices` - the
 * rounded-corner part of the Minkowski sum {@link nearestInflatedEdgeHit}
 * only approximates with a straight edge. The vertex itself, not
 * `raycastCircle`'s own hit point (the moving circle's *center* at contact,
 * `radius` away from the vertex), is the actual surface contact point.
 */
function nearestVertexHit(
  vertices: readonly Vector2[],
  radius: number,
  start: Vector2,
  end: Vector2,
): CenterTravelHit | null {
  const vertexCollider = new CircleCollider(radius);
  let closest: CenterTravelHit | null = null;

  for (const vertex of vertices) {
    const hit = raycastCircle(
      { position: vertex, rotation: 0, collider: vertexCollider },
      start,
      end,
    );

    if (hit !== null && (closest === null || hit.distance < closest.distance)) {
      closest = {
        centerAtContact: hit.point,
        normal: hit.normal,
        distance: hit.distance,
      };
    }
  }

  return closest;
}

/**
 * Sweeps a circle of `radius` from `start` to `end` against a convex
 * shape's world-space `vertices`/`normals`, finding the earliest time of
 * impact (TOI), if any. This is the shared core both
 * {@link sweepCirclePolygon} and `sweepCircleTerrain` (which has no single
 * `PolygonCollider` to call `getWorldVertices`/`getWorldNormals` on, since a
 * `TerrainCollider` is non-convex overall) build their own world-space
 * vertices/normals for and delegate to - mirroring how
 * {@link raycastConvexPolygon} is shared between `raycastPolygon` and
 * `raycastTerrain`.
 * @param vertices - The convex shape's world-space vertices, in order.
 * @param normals - The convex shape's world-space outward-facing edge
 * normals, one per edge between consecutive `vertices`.
 * @param radius - The moving circle's radius.
 * @param start - The circle's world-space center at the start of the swept
 * translation.
 * @param end - The circle's world-space center at the end of the swept
 * translation.
 * @returns The earliest {@link SweepHit}, or `null` if the circle never
 * touches the shape along the swept translation. A `t` of `0` means the
 * circle already overlaps the shape at `start`.
 */
export function sweepCircleAgainstConvexShape(
  vertices: readonly Vector2[],
  normals: readonly Vector2[],
  radius: number,
  start: Vector2,
  end: Vector2,
): SweepHit | null {
  const overlapAtStart = findClosestFace(vertices, normals, start, radius);

  if (overlapAtStart !== null) {
    const contact = findCircleContact(
      vertices,
      normals,
      start,
      overlapAtStart.faceIndex,
      overlapAtStart.separation,
      radius,
    );

    if (contact !== null) {
      return {
        point: contact.localContactPoint,
        normal: contact.localNormal,
        t: 0,
      };
    }
  }

  const totalDistance = Vec2.distanceTo(start, end);

  if (totalDistance === 0) {
    return null;
  }

  const rawEdgeHit = nearestInflatedEdgeHit(
    vertices,
    normals,
    radius,
    start,
    end,
  );
  const edgeHit: CenterTravelHit | null =
    rawEdgeHit === null
      ? null
      : {
          centerAtContact: rawEdgeHit.point,
          normal: rawEdgeHit.normal,
          distance: rawEdgeHit.distance,
        };
  const vertexHit = nearestVertexHit(vertices, radius, start, end);
  const closest = closerHit(edgeHit, vertexHit);

  if (closest === null) {
    return null;
  }

  return toSweepHit(closest, radius, totalDistance);
}

/**
 * Sweeps a circle from `startPosition` to `endPosition` against a static
 * convex polygon body, finding the earliest time of impact (TOI) in the
 * swept translation, if any. Implemented as the standard circle-vs-convex-
 * shape Minkowski sweep (see {@link sweepCircleAgainstConvexShape}): a ray
 * from `startPosition` to `endPosition` first touches the polygon inflated
 * by the circle's radius at the same parametric time the circle itself
 * first touches the polygon.
 * @param circleBody - The moving body; only its {@link CircleCollider} (for
 * `radius`/`offset`) is used - `startPosition`/`endPosition` give the
 * swept trajectory, not `circleBody.position`.
 * @param staticPolygonBody - The static body with a {@link PolygonCollider}
 * being swept against.
 * @param startPosition - The circle's world-space position at the start of
 * the swept translation (before `circleBody.collider`'s `offset` is
 * applied).
 * @param endPosition - The circle's world-space position at the end of the
 * swept translation (before `circleBody.collider`'s `offset` is applied).
 * @returns The earliest {@link SweepHit}, or `null` if the circle never
 * touches the polygon along the swept translation. A `t` of `0` means the
 * circle already overlaps the polygon at `startPosition`.
 */
export function sweepCirclePolygon(
  circleBody: CollisionBody,
  staticPolygonBody: CollisionBody,
  startPosition: Vector2,
  endPosition: Vector2,
): SweepHit | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const polygonCollider = staticPolygonBody.collider as PolygonCollider;
  const vertices = polygonCollider.getWorldVertices(
    staticPolygonBody.position,
    staticPolygonBody.rotation,
  );
  const normals = polygonCollider.getWorldNormals(staticPolygonBody.rotation);

  // Clone before adding: `startPosition`/`endPosition` are the caller's own
  // trajectory points, so this must not mutate them.
  const sweepStart = Vec2.add(Vec2.clone(startPosition), circleCollider.offset);
  const sweepEnd = Vec2.add(Vec2.clone(endPosition), circleCollider.offset);

  return sweepCircleAgainstConvexShape(
    vertices,
    normals,
    circleCollider.radius,
    sweepStart,
    sweepEnd,
  );
}
