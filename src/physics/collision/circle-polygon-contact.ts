import type { Vector2 } from '../../math/index.js';

const EPSILON = 1e-9;

/**
 * The face of a convex polygon (in the polygon's own local space) with the
 * largest separation from a circle's local-space center, found by
 * {@link findClosestFace}.
 */
export interface FaceSeparation {
  /**
   * The signed distance from the face to the circle's center, along the
   * face's normal. Positive when the center is outside the face.
   */
  separation: number;

  /**
   * The index of the face (and its normal) within the polygon's
   * `vertices`/`normals` arrays.
   */
  faceIndex: number;
}

/**
 * A circle's contact against a convex polygon face or vertex, in the
 * polygon's own local space, found by {@link findCircleContact}.
 */
export interface CircleContact {
  /**
   * The contact normal, pointing from the polygon toward the circle.
   */
  localNormal: Vector2;

  /**
   * The contact point, on the surface of the polygon.
   */
  localContactPoint: Vector2;

  /**
   * The penetration depth of the contact.
   */
  depth: number;
}

/**
 * Finds the polygon face with the largest separation from `localCenter`
 * (a circle's center, in the polygon's own local space), for use as the
 * circle's reference face. Returns `null` if the circle's `radius` cannot
 * reach any face, meaning the shapes do not overlap.
 * @param vertices - The polygon's vertices, in its own local space.
 * @param normals - The polygon's outward-facing edge normals, matching
 * `vertices`.
 * @param localCenter - The circle's center, in the polygon's local space.
 * @param radius - The circle's radius.
 * @returns The closest face and its separation, or `null` if the shapes
 * cannot overlap.
 */
export function findClosestFace(
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

/**
 * Resolves the exact contact (face or vertex) between a circle and the
 * polygon face found by {@link findClosestFace}, in the polygon's own
 * local space.
 * @param vertices - The polygon's vertices, in its own local space.
 * @param normals - The polygon's outward-facing edge normals, matching
 * `vertices`.
 * @param localCenter - The circle's center, in the polygon's local space.
 * @param faceIndex - The closest face's index, from {@link findClosestFace}.
 * @param separation - The closest face's separation, from
 * {@link findClosestFace}.
 * @param radius - The circle's radius.
 * @returns The resolved contact, or `null` if the shapes do not actually
 * overlap (the circle's center lies beyond a vertex, out of `radius`).
 */
export function findCircleContact(
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
