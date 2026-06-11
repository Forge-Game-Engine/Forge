import type { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CircleShape, PolygonShape } from '../shapes/index.js';
import type { CollisionManifold } from './collision-manifold.js';

const EPSILON = 1e-9;

interface FaceSeparation {
  separation: number;
  faceIndex: number;
}

interface CircleContact {
  localNormal: Vector2;
  localContactPoint: Vector2;
  depth: number;
}

function findClosestFace(
  vertices: readonly Vector2[],
  normals: readonly Vector2[],
  localCenter: Vector2,
  radius: number,
): FaceSeparation | null {
  let separation = -Infinity;
  let faceIndex = 0;

  for (let i = 0; i < vertices.length; i++) {
    const faceSeparation = normals[i].dot(localCenter.subtract(vertices[i]));

    if (faceSeparation > radius) {
      return null;
    }

    if (faceSeparation > separation) {
      separation = faceSeparation;
      faceIndex = i;
    }
  }

  return { separation, faceIndex };
}

function faceContact(
  normal: Vector2,
  localCenter: Vector2,
  separation: number,
  radius: number,
): CircleContact {
  return {
    localNormal: normal,
    localContactPoint: localCenter.subtract(normal.multiply(separation)),
    depth: radius - separation,
  };
}

function vertexContact(
  localCenter: Vector2,
  vertex: Vector2,
  radius: number,
): CircleContact | null {
  const distance = localCenter.distanceTo(vertex);

  if (distance > radius) {
    return null;
  }

  return {
    localNormal: localCenter.subtract(vertex).normalize(),
    localContactPoint: vertex,
    depth: radius - distance,
  };
}

function findCircleContact(
  vertices: readonly Vector2[],
  normals: readonly Vector2[],
  localCenter: Vector2,
  faceIndex: number,
  separation: number,
  radius: number,
): CircleContact | null {
  if (separation < EPSILON) {
    return faceContact(normals[faceIndex], localCenter, separation, radius);
  }

  const v1 = vertices[faceIndex];
  const v2 = vertices[(faceIndex + 1) % vertices.length];
  const u1 = localCenter.subtract(v1).dot(v2.subtract(v1));

  if (u1 <= 0) {
    return vertexContact(localCenter, v1, radius);
  }

  const u2 = localCenter.subtract(v2).dot(v1.subtract(v2));

  if (u2 <= 0) {
    return vertexContact(localCenter, v2, radius);
  }

  return faceContact(normals[faceIndex], localCenter, separation, radius);
}

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
