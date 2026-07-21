import type { RigidBody } from '../rigid-body.js';
import type { CircleShape, PolygonShape } from '../shapes/index.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';
import type { CollisionManifold } from './collision-manifold.js';

/**
 * Detects a collision between a circle-shaped body and a polygon-shaped
 * body.
 * @param circleBody - The body with a {@link CircleShape}. Becomes
 * `bodyA` of the returned manifold.
 * @param polygonBody - The body with a {@link PolygonShape}. Becomes
 * `bodyB` of the returned manifold.
 * @returns A {@link CollisionManifold} if the shapes overlap, otherwise
 * `null`.
 */
export function detectCirclePolygonCollision(
  circleBody: RigidBody,
  polygonBody: RigidBody,
): CollisionManifold | null {
  const circleShape = circleBody.shape as CircleShape;
  const polygonShape = polygonBody.shape as PolygonShape;
  const { radius } = circleShape;
  const { vertices, normals } = polygonShape;

  const localCenter = circleBody.position
    .subtract(polygonBody.position)
    .rotate(-polygonBody.angle);

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

  const normal = contact.localNormal.rotate(polygonBody.angle).negate();
  const contactPoint = contact.localContactPoint
    .rotate(polygonBody.angle)
    .add(polygonBody.position);

  return {
    bodyA: circleBody,
    bodyB: polygonBody,
    normal,
    depth: contact.depth,
    contactPoints: [contactPoint],
  };
}
