import type { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { PolygonShape, TerrainShape } from '../shapes/index.js';
import type { CollisionManifold } from './collision-manifold.js';
import {
  detectPolygonFacesCollision,
  type PolygonFaces,
  type PolygonFacesContact,
} from './polygon-faces-collision.js';

function localXRange(
  worldVertices: readonly Vector2[],
  terrainBody: RigidBody,
): { minX: number; maxX: number } {
  let minX = Infinity;
  let maxX = -Infinity;

  for (const vertex of worldVertices) {
    const localX = vertex
      .subtract(terrainBody.position)
      .rotate(-terrainBody.angle).x;

    minX = Math.min(minX, localX);
    maxX = Math.max(maxX, localX);
  }

  return { minX, maxX };
}

/**
 * Detects a collision between a convex polygon-shaped body and a
 * terrain-shaped body, by running the same polygon-vs-polygon narrow phase
 * used for {@link detectPolygonPolygonCollision} against each of the
 * terrain's segments that overlap the polygon's local x-range, keeping the
 * deepest resulting contact.
 * @param polygonBody - The body with a {@link PolygonShape}. Becomes
 * `bodyA` of the returned manifold.
 * @param terrainBody - The body with a {@link TerrainShape}. Becomes
 * `bodyB` of the returned manifold.
 * @returns A {@link CollisionManifold} if the shapes overlap, otherwise
 * `null`.
 */
export function detectPolygonTerrainCollision(
  polygonBody: RigidBody,
  terrainBody: RigidBody,
): CollisionManifold | null {
  const polygonShape = polygonBody.shape as PolygonShape;
  const terrainShape = terrainBody.shape as TerrainShape;

  const polygonFaces: PolygonFaces = {
    vertices: polygonShape.getWorldVertices(
      polygonBody.position,
      polygonBody.angle,
    ),
    normals: polygonShape.getWorldNormals(polygonBody.angle),
  };

  const { minX, maxX } = localXRange(polygonFaces.vertices, terrainBody);

  let best: PolygonFacesContact | null = null;

  for (const segment of terrainShape.segments) {
    if (maxX < segment.minX || minX > segment.maxX) {
      continue;
    }

    const segmentFaces: PolygonFaces = {
      vertices: segment.vertices.map((vertex) =>
        vertex.rotate(terrainBody.angle).add(terrainBody.position),
      ),
      normals: segment.normals.map((normal) =>
        normal.rotate(terrainBody.angle),
      ),
    };

    const contact = detectPolygonFacesCollision(polygonFaces, segmentFaces);

    if (contact !== null && (best === null || contact.depth > best.depth)) {
      best = contact;
    }
  }

  if (best === null) {
    return null;
  }

  return {
    bodyA: polygonBody,
    bodyB: terrainBody,
    ...best,
  };
}
