import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';

/**
 * Detects a collision between a circle-collider body and a
 * polygon-collider body.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `circleBody` toward `polygonBody`) if the shapes overlap,
 * otherwise `null`.
 */
export function detectCirclePolygonCollision(
  circleBody: CollisionBody,
  polygonBody: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const { radius } = circleCollider;
  const { vertices, normals } = polygonCollider;

  const localCenter = circleBody.position
    .add(circleCollider.offset)
    .subtract(polygonBody.position)
    .rotate(-polygonBody.rotation);

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

  const normal = contact.localNormal.rotate(polygonBody.rotation).negate();
  const contactPoint = contact.localContactPoint
    .rotate(polygonBody.rotation)
    .add(polygonBody.position);

  return {
    normal,
    depth: contact.depth,
    contactPoints: [contactPoint],
    featureIds: [0],
  };
}
