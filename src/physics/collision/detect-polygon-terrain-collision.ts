import { Vec2, Vector2 } from '../../math/index.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import {
  detectPolygonFacesCollision,
  PolygonFaces,
  PolygonFacesContact,
} from './polygon-faces-collision.js';

/**
 * Terrain segments are picked one at a time from `terrainCollider.segments`,
 * which can have far more entries than a single manifold's `featureIds`
 * would otherwise distinguish; offsetting each segment's own feature ids by
 * a large multiple of its index keeps warm-started solver state from one
 * segment from being mistakenly reused by a contact against a neighboring
 * segment.
 */
const featureIdSegmentStride = 1_000_000;

/**
 * Two segments meeting at a shared vertex (or a locally flat/near-flat run
 * of segments) compute mathematically near-identical depths for a polygon
 * resting across them, but not bit-identical ones - floating-point
 * rounding (which differs per segment, since each clips against its own
 * vertex data) makes one of them a handful of ULPs "deeper" than the
 * other. Requiring a challenger to be deeper by more than this tolerance -
 * well above any plausible floating-point noise, but far below any depth
 * difference that reflects genuinely different terrain geometry - is the
 * same bias `b2FindMaxSeparation` (Box2D) and this engine's own
 * `selectReferenceFace` (see polygon-faces-collision.ts) use to keep a
 * reference-face choice from oscillating between two near-equal
 * candidates, applied here across every segment the polygon's x-range
 * overlaps (see `detectPolygonTerrainCollision`): candidates are always
 * evaluated in a fixed, position-independent order (ascending segment
 * index), so the current best is always whichever segment was found first
 * among any near-tied group, and stays that way unless a later one is
 * *clearly* deeper.
 */
const DEPTH_TIE_TOLERANCE = 1e-6;

function localXRange(
  worldVertices: readonly Vector2[],
  terrainBody: CollisionBody,
): { minX: number; maxX: number } {
  let minX = Infinity;
  let maxX = -Infinity;

  for (const vertex of worldVertices) {
    // Clone before subtracting: `worldVertices` (`polygonFaces.vertices`) is
    // reused across every terrain segment in the caller's loop.
    const localX = Vec2.rotate(
      Vec2.subtract(Vec2.clone(vertex), terrainBody.position),
      -terrainBody.rotation,
    ).x;

    minX = Math.min(minX, localX);
    maxX = Math.max(maxX, localX);
  }

  return { minX, maxX };
}

/**
 * Detects a collision between a polygon-collider body and a
 * terrain-collider body, by running the same polygon-vs-polygon narrow
 * phase used for {@link detectPolygonPolygonCollision} against each of the
 * terrain's segments that overlap the polygon's local x-range, keeping the
 * deepest resulting contact. A challenger only unseats the current best
 * when it's deeper by more than {@link DEPTH_TIE_TOLERANCE}, which (since
 * segments are always compared in a fixed, ascending-index order) is what
 * keeps warm-starting stable across ticks for a body resting across
 * multiple near-coplanar segments: two segments this close in depth are
 * either genuinely tied (differ only by floating-point noise, in which
 * case the first one found staying put is exactly right) or one is
 * trivially, stably better - never a coin-flip decided by sub-ULP
 * rounding.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `polygonBody` toward `terrainBody`) if the shapes overlap,
 * otherwise `null`.
 */
export function detectPolygonTerrainCollision(
  polygonBody: CollisionBody,
  terrainBody: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;

  const polygonFaces: PolygonFaces = {
    vertices: polygonCollider.getWorldVertices(
      polygonBody.position,
      polygonBody.rotation,
    ),
    normals: polygonCollider.getWorldNormals(polygonBody.rotation),
  };

  const { minX, maxX } = localXRange(polygonFaces.vertices, terrainBody);

  let best: PolygonFacesContact | null = null;
  let bestSegmentIndex = 0;

  for (
    let segmentIndex = 0;
    segmentIndex < terrainCollider.segments.length;
    segmentIndex++
  ) {
    const segment = terrainCollider.segments[segmentIndex];

    if (maxX < segment.minX || minX > segment.maxX) {
      continue;
    }

    // Clone before rotating: `segment.vertices`/`segment.normals` are the
    // terrain collider's own persistent local-space segment data (its
    // surface vertices alias `terrainCollider.points` directly), reused
    // every tick.
    const segmentFaces: PolygonFaces = {
      vertices: segment.vertices.map((vertex) =>
        Vec2.add(
          Vec2.rotate(Vec2.clone(vertex), terrainBody.rotation),
          terrainBody.position,
        ),
      ),
      normals: segment.normals.map((normal) =>
        Vec2.rotate(Vec2.clone(normal), terrainBody.rotation),
      ),
    };

    const contact = detectPolygonFacesCollision(polygonFaces, segmentFaces);

    if (
      contact !== null &&
      (best === null || contact.depth > best.depth + DEPTH_TIE_TOLERANCE)
    ) {
      best = contact;
      bestSegmentIndex = segmentIndex;
    }
  }

  if (best === null) {
    return null;
  }

  return {
    normal: best.normal,
    depth: best.depth,
    contactPoints: best.contactPoints,
    featureIds: best.featureIds.map(
      (featureId) => featureId + bestSegmentIndex * featureIdSegmentStride,
    ),
  };
}
