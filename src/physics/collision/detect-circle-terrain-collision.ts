import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  TerrainCollider,
  TerrainSegment,
} from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';

/**
 * The index, within a `TerrainSegment`'s own 4-vertex quad
 * (`[surfaceLeft, surfaceRight, bottomRight, bottomLeft]`), of the top
 * (surface) face - the only face two neighboring segments can legitimately
 * share a contact-worthy boundary on. A segment's side faces are always
 * exactly coincident with its neighbor's facing side face (both built from
 * the same shared surface point down to the same shared bottom point), so
 * they never need cross-segment reconciliation the way the sloped surface
 * faces do.
 */
const TOP_FACE_INDEX = 0;

/**
 * Two segments meeting at a shared surface vertex (or a locally flat/
 * near-flat run of segments) compute mathematically near-identical - or,
 * for a genuinely different neighboring face, genuinely close - depths
 * that differ only by a handful of ULPs of floating-point rounding (each
 * segment computes against its own vertex data). Requiring a challenger to
 * be deeper by more than this tolerance - well above any plausible
 * floating-point noise, but far below any depth difference that reflects
 * genuinely different terrain geometry - is the same bias
 * `b2FindMaxSeparation` (Box2D) and this engine's own `selectReferenceFace`
 * (see polygon-faces-collision.ts) use to keep a reference-face choice
 * from oscillating between two near-equal candidates, applied here across
 * every segment the circle's x-range overlaps (see `findSurfaceContact`).
 */
const DEPTH_TIE_TOLERANCE = 1e-6;

interface SurfaceContact {
  localNormal: Vector2;
  localContactPoint: Vector2;
  depth: number;
  segmentIndex: number;

  /**
   * The terrain point index this contact resolved to, when it clamped to
   * one of the segment's own surface vertices (shared with a neighboring
   * segment) - `null` for a genuine face contact.
   */
  vertexIndex: number | null;
}

function contactAgainstSegment(
  segment: TerrainSegment,
  segmentIndex: number,
  localCenter: Vector2,
  radius: number,
): SurfaceContact | null {
  const { vertices, normals } = segment;
  const closestFace = findClosestFace(vertices, normals, localCenter, radius);

  if (closestFace === null) {
    return null;
  }

  const contact = findCircleContact(
    vertices,
    normals,
    localCenter,
    closestFace.faceIndex,
    closestFace.separation,
    radius,
  );

  if (contact === null) {
    return null;
  }

  let vertexIndex: number | null = null;

  // `findCircleContact` returns a vertex's own stored coordinates verbatim
  // (see circle-polygon-contact.ts's `vertexContact`) rather than an
  // interpolated point, so exact equality reliably detects a vertex clamp.
  if (closestFace.faceIndex === TOP_FACE_INDEX) {
    if (
      contact.localContactPoint.x === vertices[0].x &&
      contact.localContactPoint.y === vertices[0].y
    ) {
      vertexIndex = segmentIndex;
    } else if (
      contact.localContactPoint.x === vertices[1].x &&
      contact.localContactPoint.y === vertices[1].y
    ) {
      vertexIndex = segmentIndex + 1;
    }
  }

  return {
    localNormal: contact.localNormal,
    localContactPoint: contact.localContactPoint,
    depth: contact.depth,
    segmentIndex,
    vertexIndex,
  };
}

/**
 * Chooses between the best contact found so far and a newly-evaluated
 * candidate segment's contact, preferring (in order):
 * 1. Between two contacts clamped to the *same* shared vertex, either one
 *    (they're the same physical point either way) - keeping `current`
 *    means the reported contact never depends on which of the two
 *    segments sharing that vertex happened to be evaluated first.
 * 2. A deeper contact, but only when it's deeper than `current` by more
 *    than {@link DEPTH_TIE_TOLERANCE} - candidates are always evaluated in
 *    a fixed, position-independent order (ascending segment index, see
 *    `findSurfaceContact`), so `current` is always whichever segment was
 *    found first among any near-tied group, and stays that way unless a
 *    later one is *clearly* deeper.
 */
function preferContact(
  current: SurfaceContact | null,
  challenger: SurfaceContact | null,
): SurfaceContact | null {
  if (challenger === null) {
    return current;
  }

  if (current === null) {
    return challenger;
  }

  if (
    current.vertexIndex !== null &&
    current.vertexIndex === challenger.vertexIndex
  ) {
    return current;
  }

  return challenger.depth > current.depth + DEPTH_TIE_TOLERANCE
    ? challenger
    : current;
}

/**
 * Finds a circle's contact against the terrain's surface, by running the
 * same circle-vs-convex-polygon narrow phase used for
 * {@link detectCirclePolygonCollision} against every segment the circle's
 * local x-range overlaps and keeping the deepest resulting contact (see
 * {@link preferContact}).
 *
 * A contact clamped to a vertex shared between two segments is pinned to
 * that vertex's own identity (see `detectCircleTerrainCollision`'s feature
 * id derivation) rather than to whichever of the two segments produced it,
 * and {@link DEPTH_TIE_TOLERANCE} keeps the winner stable for two segments
 * whose face contacts are only *near*-tied (their sloped faces meeting at
 * a shared vertex, rather than clamping to it) - together, this is what
 * keeps warm-starting stable for a wide body resting across several
 * near-coplanar segments, without either racing an unbounded, order-
 * sensitive comparison across them or arbitrarily limiting how many
 * segments a wide body can be compared against.
 * @param terrainCollider - The terrain to test against.
 * @param localCenter - The circle's center, in the terrain's own local space.
 * @param radius - The circle's radius.
 * @returns The contact, or `null` if the circle doesn't reach the terrain.
 */
function findSurfaceContact(
  terrainCollider: TerrainCollider,
  localCenter: Vector2,
  radius: number,
): SurfaceContact | null {
  let best: SurfaceContact | null = null;

  for (
    let segmentIndex = 0;
    segmentIndex < terrainCollider.segments.length;
    segmentIndex++
  ) {
    const segment = terrainCollider.segments[segmentIndex];

    if (
      localCenter.x + radius < segment.minX ||
      localCenter.x - radius > segment.maxX
    ) {
      continue;
    }

    best = preferContact(
      best,
      contactAgainstSegment(segment, segmentIndex, localCenter, radius),
    );
  }

  return best;
}

/**
 * Detects a collision between a circle-collider body and a
 * terrain-collider body, by finding the circle's contact against the
 * terrain's surface (see {@link findSurfaceContact}).
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `circleBody` toward `terrainBody`) if the shapes overlap,
 * otherwise `null`.
 */
export function detectCircleTerrainCollision(
  circleBody: CollisionBody,
  terrainBody: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { radius } = circleCollider;

  // Clone before adding: `circleBody.position` is the entity's live world
  // position, so this must not mutate it.
  const localCenter = Vec2.rotate(
    Vec2.subtract(
      Vec2.add(Vec2.clone(circleBody.position), circleCollider.offset),
      terrainBody.position,
    ),
    -terrainBody.rotation,
  );

  const contact = findSurfaceContact(terrainCollider, localCenter, radius);

  if (contact === null) {
    return null;
  }

  // `contact.localNormal`/`contact.localContactPoint` are always fresh
  // clones (see circle-polygon-contact.ts), so mutating them in place here
  // is safe.
  const normal = Vec2.negate(
    Vec2.rotate(contact.localNormal, terrainBody.rotation),
  );
  const contactPoint = Vec2.add(
    Vec2.rotate(contact.localContactPoint, terrainBody.rotation),
    terrainBody.position,
  );

  // A vertex-pinned contact's feature id is offset past every valid segment
  // index, so it can never collide with a face contact's plain segment
  // index - and it stays the same regardless of which of the two segments
  // sharing that vertex happens to produce it on a later tick.
  const featureId =
    contact.vertexIndex === null
      ? contact.segmentIndex
      : terrainCollider.segments.length + contact.vertexIndex;

  return {
    normal,
    depth: contact.depth,
    contactPoints: [contactPoint],
    featureIds: [featureId],
  };
}
