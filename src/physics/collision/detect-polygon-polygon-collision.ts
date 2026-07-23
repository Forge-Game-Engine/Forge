import type { RigidBody } from '../rigid-body.js';
import type { PolygonShape } from '../shapes/index.js';
import type { CollisionManifold } from './collision-manifold.js';
import {
  detectPolygonFacesCollision,
  type PolygonFaces,
} from './polygon-faces-collision.js';

/**
 * Detects a collision between two convex polygon-shaped bodies using the
 * separating axis theorem with reference/incident face clipping.
 * @param bodyA - The first body, with a {@link PolygonShape}.
 * @param bodyB - The second body, with a {@link PolygonShape}.
 * @returns A {@link CollisionManifold} if the polygons overlap, otherwise
 * `null`.
 */
export function detectPolygonPolygonCollision(
  bodyA: RigidBody,
  bodyB: RigidBody,
): CollisionManifold | null {
  const shapeA = bodyA.shape as PolygonShape;
  const shapeB = bodyB.shape as PolygonShape;

  const facesA: PolygonFaces = {
    vertices: shapeA.getWorldVertices(bodyA.position, bodyA.angle),
    normals: shapeA.getWorldNormals(bodyA.angle),
  };
  const facesB: PolygonFaces = {
    vertices: shapeB.getWorldVertices(bodyB.position, bodyB.angle),
    normals: shapeB.getWorldNormals(bodyB.angle),
  };

  const contact = detectPolygonFacesCollision(facesA, facesB);

  if (contact === null) {
    return null;
  }

  return {
    bodyA,
    bodyB,
    ...contact,
  };
}
