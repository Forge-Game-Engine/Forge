import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { detectPolygonFacesCollision } from './polygon-faces-collision.js';

/**
 * Detects a collision between two polygon-collider bodies, using the
 * separating axis theorem with reference/incident face clipping.
 * @param bodyA - The first body, with a {@link PolygonCollider}.
 * @param bodyB - The second body, with a {@link PolygonCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `bodyA` toward `bodyB`) if the polygons overlap, otherwise
 * `null`.
 */
export function detectPolygonPolygonCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const colliderA = bodyA.collider as PolygonCollider;
  const colliderB = bodyB.collider as PolygonCollider;

  const facesA = {
    vertices: colliderA.getWorldVertices(bodyA.position, bodyA.rotation),
    normals: colliderA.getWorldNormals(bodyA.rotation),
  };
  const facesB = {
    vertices: colliderB.getWorldVertices(bodyB.position, bodyB.rotation),
    normals: colliderB.getWorldNormals(bodyB.rotation),
  };

  return detectPolygonFacesCollision(facesA, facesB);
}
