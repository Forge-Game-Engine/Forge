import { Vector2 } from '../../math/index.js';

const RELATIVE_TOLERANCE = 0.95;
const ABSOLUTE_TOLERANCE = 0.01;

/**
 * The world-space vertices and outward-facing edge normals of a convex
 * polygon, as consumed by {@link detectPolygonFacesCollision}.
 */
export interface PolygonFaces {
  vertices: Vector2[];
  normals: Vector2[];
}

/**
 * The result of a successful {@link detectPolygonFacesCollision} check,
 * everything a {@link CollisionManifold} needs besides the two bodies
 * involved.
 */
export interface PolygonFacesContact {
  /**
   * The contact normal, in world space, pointing from `facesA` toward
   * `facesB`.
   */
  normal: Vector2;

  /**
   * The penetration depth of the contact.
   */
  depth: number;

  /**
   * The world-space contact points (one or two points).
   */
  contactPoints: Vector2[];
}

interface Axis {
  separation: number;
  faceIndex: number;
}

interface ReferenceIncidentFaces {
  reference: PolygonFaces;
  incident: PolygonFaces;
  faceIndex: number;
  flip: boolean;
}

/**
 * Returns the vertex that is furthest along the given direction.
 */
function getSupportPoint(vertices: Vector2[], direction: Vector2): Vector2 {
  let bestVertex = vertices[0];
  let bestProjection = direction.dot(bestVertex);

  for (let i = 1; i < vertices.length; i++) {
    const projection = direction.dot(vertices[i]);

    if (projection > bestProjection) {
      bestVertex = vertices[i];
      bestProjection = projection;
    }
  }

  return bestVertex;
}

/**
 * Finds the face of the first polygon whose normal yields the largest
 * separation from the second polygon. A positive separation means the
 * polygons do not overlap along that axis.
 */
function findAxisOfLeastPenetration(
  ownVertices: Vector2[],
  ownNormals: Vector2[],
  otherVertices: Vector2[],
): Axis {
  let bestSeparation = -Infinity;
  let bestFaceIndex = 0;

  for (let i = 0; i < ownNormals.length; i++) {
    const normal = ownNormals[i];
    const supportPoint = getSupportPoint(otherVertices, normal.negate());
    const separation = normal.dot(supportPoint.subtract(ownVertices[i]));

    if (separation > bestSeparation) {
      bestSeparation = separation;
      bestFaceIndex = i;
    }
  }

  return { separation: bestSeparation, faceIndex: bestFaceIndex };
}

/**
 * Picks which polygon's face of least penetration acts as the reference
 * face, biasing toward the first polygon to avoid face-flip jitter when the
 * separations are nearly equal.
 */
function selectReferenceFace(
  polygonA: PolygonFaces,
  polygonB: PolygonFaces,
  axisA: Axis,
  axisB: Axis,
): ReferenceIncidentFaces {
  const flip =
    axisB.separation >
    RELATIVE_TOLERANCE * axisA.separation + ABSOLUTE_TOLERANCE;

  if (flip) {
    return {
      reference: polygonB,
      incident: polygonA,
      faceIndex: axisB.faceIndex,
      flip,
    };
  }

  return {
    reference: polygonA,
    incident: polygonB,
    faceIndex: axisA.faceIndex,
    flip,
  };
}

/**
 * Finds the incident polygon's face whose normal is most anti-parallel to
 * the reference face's normal.
 */
function findIncidentFaceIndex(
  referenceNormal: Vector2,
  incidentNormals: Vector2[],
): number {
  let incidentFaceIndex = 0;
  let minDot = Infinity;

  for (let i = 0; i < incidentNormals.length; i++) {
    const dot = referenceNormal.dot(incidentNormals[i]);

    if (dot < minDot) {
      minDot = dot;
      incidentFaceIndex = i;
    }
  }

  return incidentFaceIndex;
}

/**
 * Clips the segment `v1`-`v2` against the half-plane
 * `normal . point <= offset`, returning the points that lie within it
 * (including any interpolated intersection point).
 */
function clip(
  v1: Vector2,
  v2: Vector2,
  normal: Vector2,
  offset: number,
): Vector2[] {
  const result: Vector2[] = [];

  const distance1 = normal.dot(v1) - offset;
  const distance2 = normal.dot(v2) - offset;

  if (distance1 <= 0) {
    result.push(v1);
  }

  if (distance2 <= 0) {
    result.push(v2);
  }

  if (distance1 * distance2 < 0) {
    const t = distance1 / (distance1 - distance2);

    result.push(v1.add(v2.subtract(v1).multiply(t)));
  }

  return result;
}

/**
 * Clips the incident edge against the two side planes of the reference
 * face, returning `null` if the incident edge lies entirely outside either
 * side plane.
 */
function clipIncidentEdge(
  incidentV1: Vector2,
  incidentV2: Vector2,
  referenceV1: Vector2,
  referenceV2: Vector2,
): Vector2[] | null {
  const tangent = referenceV2.subtract(referenceV1).normalize();
  const negativeSideOffset = -tangent.dot(referenceV1);
  const positiveSideOffset = tangent.dot(referenceV2);

  let clippedPoints = clip(
    incidentV1,
    incidentV2,
    tangent.negate(),
    negativeSideOffset,
  );

  if (clippedPoints.length < 2) {
    return null;
  }

  clippedPoints = clip(
    clippedPoints[0],
    clippedPoints[1],
    tangent,
    positiveSideOffset,
  );

  if (clippedPoints.length < 2) {
    return null;
  }

  return clippedPoints;
}

/**
 * Discards clipped points that are not penetrating the reference face and
 * computes the penetration depth of the remaining contact points.
 */
function findContactPoints(
  clippedPoints: Vector2[],
  referenceNormal: Vector2,
  referenceV1: Vector2,
): { contactPoints: Vector2[]; depth: number } {
  const contactPoints: Vector2[] = [];
  let depth = 0;

  for (const point of clippedPoints) {
    const separation = referenceNormal.dot(point.subtract(referenceV1));

    if (separation <= 0) {
      contactPoints.push(point);
      depth = Math.max(depth, -separation);
    }
  }

  return { contactPoints, depth };
}

/**
 * Detects a collision between two convex polygons, given as world-space
 * {@link PolygonFaces}, using the separating axis theorem with
 * reference/incident face clipping.
 * @param facesA - The first polygon's world-space vertices and normals.
 * @param facesB - The second polygon's world-space vertices and normals.
 * @returns A {@link PolygonFacesContact} if the polygons overlap, otherwise
 * `null`.
 */
export function detectPolygonFacesCollision(
  facesA: PolygonFaces,
  facesB: PolygonFaces,
): PolygonFacesContact | null {
  const axisA = findAxisOfLeastPenetration(
    facesA.vertices,
    facesA.normals,
    facesB.vertices,
  );

  if (axisA.separation > 0) {
    return null;
  }

  const axisB = findAxisOfLeastPenetration(
    facesB.vertices,
    facesB.normals,
    facesA.vertices,
  );

  if (axisB.separation > 0) {
    return null;
  }

  const { reference, incident, faceIndex, flip } = selectReferenceFace(
    facesA,
    facesB,
    axisA,
    axisB,
  );

  const referenceNormal = reference.normals[faceIndex];
  const incidentFaceIndex = findIncidentFaceIndex(
    referenceNormal,
    incident.normals,
  );

  const incidentV1 = incident.vertices[incidentFaceIndex];
  const incidentV2 =
    incident.vertices[(incidentFaceIndex + 1) % incident.vertices.length];

  const referenceV1 = reference.vertices[faceIndex];
  const referenceV2 =
    reference.vertices[(faceIndex + 1) % reference.vertices.length];

  const clippedPoints = clipIncidentEdge(
    incidentV1,
    incidentV2,
    referenceV1,
    referenceV2,
  );

  if (clippedPoints === null) {
    return null;
  }

  const { contactPoints, depth } = findContactPoints(
    clippedPoints,
    referenceNormal,
    referenceV1,
  );

  if (contactPoints.length === 0) {
    return null;
  }

  const normal = flip ? referenceNormal.negate() : referenceNormal;

  return {
    normal,
    depth,
    contactPoints,
  };
}
