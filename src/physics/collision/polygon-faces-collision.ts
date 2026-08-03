import {
  type Vector2,
  vector2Add,
  vector2Clone,
  vector2Dot,
  vector2Multiply,
  vector2Negate,
  vector2Normalize,
  vector2Subtract,
} from '../../math/index.js';

const RELATIVE_TOLERANCE = 0.95;
const ABSOLUTE_TOLERANCE = 0.01;

/**
 * The world-space vertices and outward-facing edge normals of a convex
 * polygon, as consumed by {@link detectPolygonFacesCollision}.
 *
 * `detectPolygonFacesCollision` never mutates `vertices`/`normals` (or their
 * elements) - callers may safely reuse the same `PolygonFaces` object across
 * multiple calls (e.g. against several terrain segments).
 */
export interface PolygonFaces {
  vertices: Vector2[];
  normals: Vector2[];
}

/**
 * The result of a successful {@link detectPolygonFacesCollision} check,
 * everything a collision manifold needs besides the two entities involved.
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

  /**
   * Identifiers for each entry in `contactPoints` (same length, same order),
   * stable across ticks for the same reference/incident edge pairing. See
   * {@link CollisionManifold.featureIds}.
   */
  featureIds: number[];
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
  let bestProjection = vector2Dot(direction, bestVertex);

  for (let i = 1; i < vertices.length; i++) {
    const projection = vector2Dot(direction, vertices[i]);

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
    // Clone before negating/subtracting: `normal` is `ownNormals[i]` (read
    // again later as the reference/incident normal) and `supportPoint` is an
    // element of `otherVertices` (reused across faces and, for terrain,
    // across every segment sharing the same `PolygonFaces`).
    const supportPoint = getSupportPoint(
      otherVertices,
      vector2Negate(vector2Clone(normal)),
    );
    const separation = vector2Dot(
      normal,
      vector2Subtract(vector2Clone(supportPoint), ownVertices[i]),
    );

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
    const dot = vector2Dot(referenceNormal, incidentNormals[i]);

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
 * (including any interpolated intersection point). `v1`/`v2` themselves are
 * never mutated, and may be pushed into the result as-is (still aliasing the
 * caller's own vertex data).
 */
function clip(
  v1: Vector2,
  v2: Vector2,
  normal: Vector2,
  offset: number,
): Vector2[] {
  const result: Vector2[] = [];

  const distance1 = vector2Dot(normal, v1) - offset;
  const distance2 = vector2Dot(normal, v2) - offset;

  if (distance1 <= 0) {
    result.push(v1);
  }

  if (distance2 <= 0) {
    result.push(v2);
  }

  if (distance1 * distance2 < 0) {
    const t = distance1 / (distance1 - distance2);

    // Clone before subtracting/adding: `v1`/`v2` may alias the caller's own
    // vertex data.
    result.push(
      vector2Add(
        vector2Clone(v1),
        vector2Multiply(vector2Subtract(vector2Clone(v2), v1), t),
      ),
    );
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
  // Clone before subtracting/negating: `referenceV1`/`referenceV2` alias the
  // caller's own vertex data, and `tangent` is reused across both `clip`
  // calls below.
  const tangent = vector2Subtract(vector2Clone(referenceV2), referenceV1);

  vector2Normalize(tangent);

  const negativeSideOffset = -vector2Dot(tangent, referenceV1);
  const positiveSideOffset = vector2Dot(tangent, referenceV2);

  let clippedPoints = clip(
    incidentV1,
    incidentV2,
    vector2Negate(vector2Clone(tangent)),
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
 * @param featureIdForIndex - Derives a stable feature id for a clipped
 * point from its index within `clippedPoints` (always 0 or 1, since
 * `clipIncidentEdge` always clips down to the incident edge's two
 * endpoints).
 */
function findContactPoints(
  clippedPoints: Vector2[],
  referenceNormal: Vector2,
  referenceV1: Vector2,
  featureIdForIndex: (pointIndex: number) => number,
): { contactPoints: Vector2[]; featureIds: number[]; depth: number } {
  const contactPoints: Vector2[] = [];
  const featureIds: number[] = [];
  let depth = 0;

  for (let i = 0; i < clippedPoints.length; i++) {
    const point = clippedPoints[i];
    // Clone before subtracting: `point` may alias the caller's own vertex
    // data, and is pushed into `contactPoints` unchanged below.
    const separation = vector2Dot(
      referenceNormal,
      vector2Subtract(vector2Clone(point), referenceV1),
    );

    if (separation <= 0) {
      contactPoints.push(point);
      featureIds.push(featureIdForIndex(i));
      depth = Math.max(depth, -separation);
    }
  }

  return { contactPoints, featureIds, depth };
}

/**
 * Derives a feature id for a polygon-polygon contact point that stays
 * stable across ticks for the same reference/incident edge pairing, by
 * packing which polygon is the reference face, the reference and incident
 * face indices, and the point's position within the (always
 * length-2) clipped incident edge.
 */
function computeFeatureId(
  flip: boolean,
  referenceFaceIndex: number,
  incidentFaceIndex: number,
  pointIndex: number,
): number {
  return (
    ((flip ? 1 : 0) << 20) |
    ((referenceFaceIndex & 0xff) << 12) |
    ((incidentFaceIndex & 0xff) << 4) |
    (pointIndex & 0xf)
  );
}

/**
 * Detects a collision between two convex polygons, given as world-space
 * {@link PolygonFaces}, using the separating axis theorem with
 * reference/incident face clipping. Never mutates `facesA`/`facesB` (or
 * their `vertices`/`normals` elements), so callers may safely reuse the
 * same `PolygonFaces` across multiple calls.
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

  const { contactPoints, featureIds, depth } = findContactPoints(
    clippedPoints,
    referenceNormal,
    referenceV1,
    (pointIndex) =>
      computeFeatureId(flip, faceIndex, incidentFaceIndex, pointIndex),
  );

  if (contactPoints.length === 0) {
    return null;
  }

  // Clone before negating: `referenceNormal` aliases `reference.normals`,
  // reused across every call sharing the same `PolygonFaces`.
  const normal = flip
    ? vector2Negate(vector2Clone(referenceNormal))
    : referenceNormal;

  return {
    normal,
    depth,
    contactPoints,
    featureIds,
  };
}
