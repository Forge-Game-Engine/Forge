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
 * deepest resulting contact.
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

    if (contact !== null && (best === null || contact.depth > best.depth)) {
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
