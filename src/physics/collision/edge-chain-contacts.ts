import { Vec2, Vector2 } from '../../math/index.js';
import { EdgeChain } from '../colliders/edge-chain.js';
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  clipAgainstReferenceFace,
  detectPolygonFacesCollision,
  PolygonFaces,
  PolygonFacesContact,
} from './polygon-faces-collision.js';

/**
 * Every edge a polygon straddles contributes its own manifold, and the
 * solver matches a contact point up with its warm-started state by entity
 * pair and feature id alone - so two edges' contact points must never share
 * an id. `detectPolygonFacesCollision` packs its own ids into the low 21
 * bits (a flip flag at bit 20, then two face indices and a point index
 * below it), so giving each edge a stride of exactly 2^21 hands every edge
 * a range of its own with no overlap at all, however many faces the shapes
 * involved have.
 */
export const featureIdEdgeStride = 2_097_152;

/**
 * How far outside an edge's valid normal range (see
 * {@link isWithinEdgeNormalRange}) a contact normal may still fall and be
 * accepted. A contact resolved against the edge itself comes back with that
 * edge's own normal, which only differs from it by the rounding of a
 * rotation into the chain's local space and back - far below this - while
 * a normal that genuinely belongs to a neighboring edge's stretch of
 * outline is out by a visible fraction of a turn.
 */
const NORMAL_RANGE_TOLERANCE = 1e-6;

/**
 * Below this distance a vertex contact's radial direction (from the vertex
 * to the circle's center) is too short to normalize meaningfully, so the
 * adjacent face's own normal is used instead.
 */
const EPSILON = 1e-9;

/**
 * The sine of the smallest turn between two neighboring edges that counts
 * as a convex corner for one-sided collision (about 0.57 degrees), as Box2D
 * uses for its chain shapes. A chain traced from a curve or a noisy outline
 * has many joints that are straight to within rounding; with a strict
 * `> 0`, those would count as convex at random, and whether a body that has
 * sunk behind a nearly flat floor kept colliding with it would flip from
 * one edge to the next. With the tolerance, a run of nearly straight
 * joints behaves like one long edge.
 */
const convexTolerance = 0.01;

/**
 * A circle's contact against one feature (a face or a vertex) of a chain,
 * in the chain's own local space.
 */
export interface ChainCircleContact {
  /**
   * The outward contact normal, pointing from the chain toward the circle.
   */
  localNormal: Vector2;

  /**
   * The contact point, on the chain's outline.
   */
  localPoint: Vector2;

  /**
   * The signed distance from the outline to the circle's center along
   * `localNormal`. Negative when the center itself has sunk behind the
   * outline.
   */
  separation: number;

  /**
   * The contact's feature id. Face contacts use the edge's own index;
   * vertex contacts are offset past every valid edge index so the two edges
   * sharing a vertex always agree on one id for it (see
   * {@link vertexFeatureId}).
   */
  featureId: number;
}

/**
 * Converts a world-space point into a chain body's local space.
 * @param point - The world-space point. Not mutated.
 * @param chainBody - The body the chain is attached to.
 * @returns The local-space point, freshly allocated.
 */
export function toChainLocal(
  point: Vector2,
  chainBody: CollisionBody,
): Vector2 {
  // Clone before subtracting: `point` is the caller's own vector.
  return Vec2.rotate(
    Vec2.subtract(Vec2.clone(point), chainBody.position),
    -chainBody.rotation,
  );
}

/**
 * Finds the bounding box of world-space points in a chain body's local
 * space, to ask the chain for the edges they can reach.
 * @param worldPoints - The world-space points. Not mutated.
 * @param chainBody - The body the chain is attached to.
 * @returns The local-space bounding box.
 */
export function localBoundsOf(
  worldPoints: readonly Vector2[],
  chainBody: CollisionBody,
): Aabb {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of worldPoints) {
    const local = toChainLocal(point, chainBody);

    minX = Math.min(minX, local.x);
    minY = Math.min(minY, local.y);
    maxX = Math.max(maxX, local.x);
    maxY = Math.max(maxY, local.y);
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/**
 * Returns whether a local-space point is in front of an edge: on the side
 * its outward normal faces, or on its line.
 * @param chain - The chain the edge belongs to.
 * @param edgeIndex - The edge's index.
 * @param localPoint - The point, in the chain's local space.
 */
export function isInFrontOfEdge(
  chain: EdgeChain,
  edgeIndex: number,
  localPoint: Vector2,
): boolean {
  const edge = chain.edges[edgeIndex];

  return (
    edge.normal.x * (localPoint.x - edge.start.x) +
      edge.normal.y * (localPoint.y - edge.start.y) >=
    0
  );
}

function isConvexJoint(
  chain: EdgeChain,
  firstIndex: number,
  secondIndex: number,
): boolean {
  return (
    Vec2.cross(
      chain.edges[firstIndex].normal,
      chain.edges[secondIndex].normal,
    ) >= convexTolerance
  );
}

/**
 * Returns whether a body whose center is at `localCenter` is behind an edge
 * for one-sided collision, so the edge must not push it: the center is
 * behind the edge's line, and behind each neighbor that meets the edge at a
 * convex corner too. The neighbor clause keeps a body balanced on a
 * platform's corner, with its center past the top edge's line but still in
 * front of the side edge, colliding with the top edge. This is the rule
 * Box2D's chain shapes use.
 * @param chain - The chain the edge belongs to.
 * @param edgeIndex - The edge's index.
 * @param localCenter - The body's center, in the chain's local space.
 */
export function isBehindChainEdge(
  chain: EdgeChain,
  edgeIndex: number,
  localCenter: Vector2,
): boolean {
  if (isInFrontOfEdge(chain, edgeIndex, localCenter)) {
    return false;
  }

  const { previous, next } = chain.edges[edgeIndex];

  if (
    previous !== null &&
    isConvexJoint(chain, previous, edgeIndex) &&
    isInFrontOfEdge(chain, previous, localCenter)
  ) {
    return false;
  }

  return !(
    next !== null &&
    isConvexJoint(chain, edgeIndex, next) &&
    isInFrontOfEdge(chain, next, localCenter)
  );
}

/**
 * Derives the feature id of a contact clamped to the vertex at
 * `vertexIndex`. Offsetting past every edge index keeps it distinct from
 * any face contact's id, and - crucially for warm-starting - makes it
 * identical no matter which of the two edges sharing that vertex produced
 * it.
 */
function vertexFeatureId(edgeCount: number, vertexIndex: number): number {
  return edgeCount + vertexIndex;
}

/**
 * Resolves a contact that clamped to one of an edge's two endpoints.
 *
 * The endpoint is shared with a neighboring edge (`ghost`, absent only at
 * the two ends of an open chain), which is what makes this the one place a
 * chain can report a bogus normal: if the neighbor's own perpendicular foot
 * falls inside its span, the neighbor owns the contact and reports it as a
 * plain face contact, so reporting it here as well would double it up with
 * a normal tilted away from the actual outline. The circle's center
 * projecting onto the neighbor's far endpoint (`ghost.farPoint`) is exactly
 * that condition.
 * @param vertex - The shared endpoint, in local space.
 * @param vertexIndex - The endpoint's vertex index within the chain.
 * @param ownNormal - The owning edge's outward normal.
 * @param ghost - The neighboring edge's outward normal and far endpoint, or
 * `null` at either end of an open chain.
 * @param localCenter - The circle's center, in the chain's local space.
 * @param radius - The circle's radius.
 * @param edgeCount - The number of edges in the chain.
 * @returns The contact, or `null` if the neighbor owns it or the circle
 * doesn't reach the vertex.
 */
function vertexContact(
  vertex: Vector2,
  vertexIndex: number,
  ownNormal: Vector2,
  ghost: { normal: Vector2; farPoint: Vector2 } | null,
  localCenter: Vector2,
  radius: number,
  edgeCount: number,
): ChainCircleContact | null {
  // Clone before subtracting: `localCenter` is reused for every other edge,
  // and `vertex` is the collider's own stored point.
  const toCenter = Vec2.subtract(Vec2.clone(localCenter), vertex);

  let separation = Vec2.dot(ownNormal, toCenter);
  let shallowestNormal = ownNormal;

  if (ghost !== null) {
    if (
      Vec2.dot(toCenter, Vec2.subtract(Vec2.clone(ghost.farPoint), vertex)) > 0
    ) {
      return null;
    }

    const ghostSeparation = Vec2.dot(ghost.normal, toCenter);

    if (ghostSeparation > separation) {
      separation = ghostSeparation;
      shallowestNormal = ghost.normal;
    }
  }

  const featureId = vertexFeatureId(edgeCount, vertexIndex);

  if (separation < 0) {
    // The center has sunk behind both of the vertex's faces, so the radial
    // direction below would point further *into* the solid. Pushing out
    // along whichever of the two faces it is least far behind is the
    // shortest way back to the outline.
    return {
      localNormal: Vec2.clone(shallowestNormal),
      localPoint: Vec2.clone(vertex),
      separation,
      featureId,
    };
  }

  const distance = Vec2.magnitude(toCenter);

  if (distance > radius) {
    return null;
  }

  return {
    localNormal:
      distance > EPSILON
        ? Vec2.normalize(toCenter)
        : Vec2.clone(shallowestNormal),
    localPoint: Vec2.clone(vertex),
    separation: distance,
    featureId,
  };
}

/**
 * Finds a circle's contact against a single edge of a chain, in the chain's
 * own local space: a face contact when the circle's center projects onto
 * the edge's own span, and otherwise a contact clamped to whichever
 * endpoint it fell past (see {@link vertexContact}).
 * @param chain - The chain.
 * @param edgeIndex - The index of the edge to test.
 * @param localCenter - The circle's center, in the chain's local space.
 * @param radius - The circle's radius.
 * @returns The contact, or `null` if this edge isn't the one that owns it.
 */
function circleContactAgainstEdge(
  chain: EdgeChain,
  edgeIndex: number,
  localCenter: Vector2,
  radius: number,
): ChainCircleContact | null {
  const { edges } = chain;
  const edge = edges[edgeIndex];

  // Clone before subtracting: `edge.start`/`edge.end` are the collider's own
  // stored points and `localCenter` is reused for every other edge.
  const edgeVector = Vec2.subtract(Vec2.clone(edge.end), edge.start);
  const toCenter = Vec2.subtract(Vec2.clone(localCenter), edge.start);
  const projection =
    Vec2.dot(toCenter, edgeVector) / Vec2.magnitudeSquared(edgeVector);

  if (projection <= 0) {
    const previous = edge.previous === null ? null : edges[edge.previous];

    return vertexContact(
      edge.start,
      edge.startVertex,
      edge.normal,
      previous === null
        ? null
        : { normal: previous.normal, farPoint: previous.start },
      localCenter,
      radius,
      edges.length,
    );
  }

  if (projection >= 1) {
    const next = edge.next === null ? null : edges[edge.next];

    return vertexContact(
      edge.end,
      edge.endVertex,
      edge.normal,
      next === null ? null : { normal: next.normal, farPoint: next.end },
      localCenter,
      radius,
      edges.length,
    );
  }

  const separation = Vec2.dot(edge.normal, toCenter);

  if (separation > radius) {
    return null;
  }

  return {
    localNormal: Vec2.clone(edge.normal),
    localPoint: Vec2.add(Vec2.multiply(edgeVector, projection), edge.start),
    separation,
    featureId: edgeIndex,
  };
}

/**
 * Finds every contact a circle has against the given edges of a chain, in
 * the chain's own local space.
 *
 * Which features are in contact is decided purely by the geometry - an
 * edge reports a contact only when the circle actually reaches the part of
 * the outline that edge owns - so there is no comparison between candidates
 * to be decided by floating-point noise, and no single "winning" edge to
 * flip between from tick to tick. A circle resting on a flat run of edges
 * or on a convex corner produces exactly one contact; one wedged into a
 * concave corner produces one per side it touches.
 * @param chain - The chain.
 * @param edgeIndices - The edges to test, ascending (see
 * {@link EdgeChain.queryEdges}).
 * @param localCenter - The circle's center, in the chain's local space.
 * @param radius - The circle's radius.
 * @returns Every contact, in the order of `edgeIndices`. Each contact's
 * vectors are freshly allocated.
 */
export function findCircleEdgeContacts(
  chain: EdgeChain,
  edgeIndices: readonly number[],
  localCenter: Vector2,
  radius: number,
): ChainCircleContact[] {
  const contacts: ChainCircleContact[] = [];
  const seenFeatureIds = new Set<number>();

  for (const edgeIndex of edgeIndices) {
    const contact = circleContactAgainstEdge(
      chain,
      edgeIndex,
      localCenter,
      radius,
    );

    // The two edges sharing a vertex both legitimately report a contact
    // clamped to it (the circle is past the end of both), and they compute
    // the same one, so the first is kept and the second dropped rather than
    // handing the solver the same physical contact twice.
    if (contact === null || seenFeatureIds.has(contact.featureId)) {
      continue;
    }

    seenFeatureIds.add(contact.featureId);
    contacts.push(contact);
  }

  return contacts;
}

/**
 * Converts circle contacts found in a chain's local space into world-space
 * manifolds whose normals point from the circle toward the chain.
 * @param contacts - The contacts (see {@link findCircleEdgeContacts}). Their
 * vectors are transformed in place.
 * @param radius - The circle's radius.
 * @param chainBody - The body the chain is attached to.
 * @returns One manifold per contact (entity ids not yet populated).
 */
export function toCircleChainManifolds(
  contacts: readonly ChainCircleContact[],
  radius: number,
  chainBody: CollisionBody,
): NarrowPhaseManifold[] {
  return contacts.map((contact) => ({
    normal: Vec2.negate(Vec2.rotate(contact.localNormal, chainBody.rotation)),
    depth: radius - contact.separation,
    contactPoints: [
      Vec2.add(
        Vec2.rotate(contact.localPoint, chainBody.rotation),
        chainBody.position,
      ),
    ],
    featureIds: [contact.featureId],
  }));
}

/**
 * Expresses a single edge as world-space {@link PolygonFaces}, so the same
 * reference/incident face clipping that resolves every other
 * polygon-vs-polygon contact in this engine resolves a chain contact too.
 *
 * The result is a degenerate, zero-thickness 2-gon, and deliberately gives
 * *both* of its faces the edge's one outward normal instead of an opposing
 * pair. That is what makes the edge one-sided: the separating-axis search
 * can then never pick an axis pointing back into the solid, so a body can
 * only ever be pushed out along the outline - and a body that has sunk
 * behind it entirely is still pushed back out of it rather than being
 * reported as separated.
 */
function toWorldFaces(
  chain: EdgeChain,
  edgeIndex: number,
  chainBody: CollisionBody,
): PolygonFaces {
  const edge = chain.edges[edgeIndex];
  // Clone before transforming: `edge.start`/`edge.end`/`edge.normal` are the
  // collider's own persistent local-space chain data, reused every tick.
  const toWorld = (vertex: Vector2): Vector2 =>
    Vec2.add(
      Vec2.rotate(Vec2.clone(vertex), chainBody.rotation),
      chainBody.position,
    );
  const rotateNormal = (): Vector2 =>
    Vec2.rotate(Vec2.clone(edge.normal), chainBody.rotation);

  return {
    vertices: [toWorld(edge.start), toWorld(edge.end)],
    normals: [rotateNormal(), rotateNormal()],
  };
}

/**
 * Returns whether an outward contact normal is one this edge is entitled to
 * push along.
 *
 * An edge can only push perpendicular to itself, except at a vertex where
 * the solid bulges outward: there the two edges meeting at it leave a fan
 * of directions between their normals that neither edge's face covers, and
 * a body resting on the corner is legitimately pushed somewhere inside that
 * fan. At a vertex where the solid folds inward there is no such fan -
 * every direction beyond this edge's own normal belongs to the neighbor's
 * face - so anything past it is the neighbor's contact to report, not this
 * edge's.
 *
 * This is what a Box2D chain shape's ghost vertices are for, and it is the
 * one thing that keeps the reference/incident face search from resolving a
 * contact against a face of the *polygon* that has nothing to do with the
 * outline under it - a body's own side face, say, brushing the very end of
 * an edge it barely overlaps, which would shove it sideways along the
 * floor instead of out of it.
 * @param chain - The chain.
 * @param edgeIndex - The index of the edge the contact was found against.
 * @param outwardNormal - The contact's normal, pointing from the chain
 * toward the other body, in the chain's own local space.
 */
function isWithinEdgeNormalRange(
  chain: EdgeChain,
  edgeIndex: number,
  outwardNormal: Vector2,
): boolean {
  const { edges } = chain;
  const edge = edges[edgeIndex];
  const previous = edge.previous === null ? null : edges[edge.previous];
  const next = edge.next === null ? null : edges[edge.next];

  // Walking the chain, the outward normal turns from `+X` towards `+Y`
  // (clockwise on screen) across a vertex the solid bulges outward at, and
  // the other way across one it folds inward at - so a positive cross
  // product between two consecutive normals is exactly "this vertex bulges
  // outward", and the neighbor's normal is the far side of the fan it opens
  // up.
  const previousLimit =
    previous !== null && Vec2.cross(previous.normal, edge.normal) > 0
      ? previous.normal
      : edge.normal;
  const nextLimit =
    next !== null && Vec2.cross(edge.normal, next.normal) > 0
      ? next.normal
      : edge.normal;

  return (
    Vec2.cross(previousLimit, outwardNormal) >= -NORMAL_RANGE_TOLERANCE &&
    Vec2.cross(outwardNormal, nextLimit) >= -NORMAL_RANGE_TOLERANCE
  );
}

/**
 * Resolves a polygon's contact against a single edge, as a normal that edge
 * is entitled to push along.
 *
 * The separating-axis search is free to resolve the contact against a face
 * of the *polygon* instead of against the edge, which is right when the
 * polygon is lying flat across a dip or balanced on a corner, but wrong
 * when it lands on a face that has nothing to do with the outline
 * underneath - the body's own side face brushing the very end of an edge it
 * barely overlaps, say, which would shove it sideways along the floor
 * rather than out of it. Rather than drop such a contact and let the body
 * sink through, this falls back to clipping against the edge itself, which
 * can only ever push perpendicular to it.
 * @returns The contact, with its normal pointing from the polygon toward
 * the chain, or `null` if they don't overlap.
 */
function polygonContactAgainstEdge(
  polygonFaces: PolygonFaces,
  chain: EdgeChain,
  edgeIndex: number,
  chainBody: CollisionBody,
): PolygonFacesContact | null {
  const edgeFaces = toWorldFaces(chain, edgeIndex, chainBody);
  const contact = detectPolygonFacesCollision(polygonFaces, edgeFaces);

  if (contact === null) {
    return null;
  }

  // `contact.normal` points from the polygon toward the chain, so the
  // direction the chain pushes the polygon is its opposite.
  const outwardNormal = Vec2.rotate(
    Vec2.negate(Vec2.clone(contact.normal)),
    -chainBody.rotation,
  );

  if (isWithinEdgeNormalRange(chain, edgeIndex, outwardNormal)) {
    return contact;
  }

  // The edge is `edgeFaces`' only face, and it is the second of the two
  // shapes, so the resulting normal is its own outward normal negated - in
  // range by construction.
  return clipAgainstReferenceFace(edgeFaces, 0, polygonFaces, true);
}

/**
 * Finds a polygon's manifolds against the given edges of a chain, by
 * running the same reference/incident face clipping used for
 * polygon-polygon collision against each edge on its own.
 *
 * Every edge the polygon genuinely touches contributes its own manifold,
 * rather than all of them competing for one "deepest" slot. That is what
 * makes a wide body's contact stable: an edge's manifold appears when the
 * polygon reaches that edge and disappears when it leaves, its feature ids
 * stay in a range of that edge's own (see {@link featureIdEdgeStride}), and
 * no amount of floating-point noise between two near-coplanar edges can make
 * the pair of them trade places from one tick to the next and lose their
 * warm-started impulses. A contact normal can never come from an interior
 * boundary between two neighboring edges, and one that would push the
 * polygon along the outline it was found on is resolved against that
 * outline instead (see {@link polygonContactAgainstEdge}).
 * @param chain - The chain.
 * @param edgeIndices - The edges to test, ascending.
 * @param polygonFaces - The polygon's world-space faces. Not mutated.
 * @param chainBody - The body the chain is attached to.
 * @returns One manifold per edge the polygon touches (entity ids not yet
 * populated, normals pointing from the polygon toward the chain), in the
 * order of `edgeIndices`.
 */
export function findPolygonEdgeManifolds(
  chain: EdgeChain,
  edgeIndices: readonly number[],
  polygonFaces: PolygonFaces,
  chainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const manifolds: NarrowPhaseManifold[] = [];

  for (const edgeIndex of edgeIndices) {
    const contact = polygonContactAgainstEdge(
      polygonFaces,
      chain,
      edgeIndex,
      chainBody,
    );

    if (contact === null) {
      continue;
    }

    // Clone the normal and every contact point: a contact resolved against
    // one of the polygon's own faces hands back that face's stored vector,
    // and `polygonFaces` is shared by every edge in this loop - so without
    // this, two of the manifolds returned together could be holding the
    // very same vector, and whichever of them a caller transformed first
    // would silently move the other.
    manifolds.push({
      normal: Vec2.clone(contact.normal),
      depth: contact.depth,
      contactPoints: contact.contactPoints.map((point) => Vec2.clone(point)),
      featureIds: contact.featureIds.map(
        (featureId) => featureId + edgeIndex * featureIdEdgeStride,
      ),
    });
  }

  return manifolds;
}
