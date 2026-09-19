import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  TerrainCollider,
  TerrainSurfaceEdge,
} from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';

/**
 * Below this distance a vertex contact's radial direction (from the vertex
 * to the circle's center) is too short to normalize meaningfully, so the
 * adjacent surface face's own normal is used instead.
 */
const EPSILON = 1e-9;

/**
 * A circle's contact against one feature (a face or a vertex) of the
 * terrain's surface chain, in the terrain's own local space.
 */
interface SurfaceContact {
  /**
   * The outward contact normal, pointing from the terrain's surface toward
   * the circle.
   */
  localNormal: Vector2;

  /**
   * The contact point, on the terrain's surface.
   */
  localPoint: Vector2;

  /**
   * The signed distance from the surface to the circle's center along
   * `localNormal`. Negative when the center itself has sunk below the
   * surface.
   */
  separation: number;

  /**
   * The contact's feature id. Face contacts use the surface edge's own
   * index; vertex contacts are offset past every valid edge index so the
   * two edges sharing a vertex always agree on one id for it (see
   * {@link vertexFeatureId}).
   */
  featureId: number;
}

/**
 * Derives the feature id of a contact clamped to the surface point at
 * `vertexIndex`. Offsetting past every edge index keeps it distinct from
 * any face contact's id, and - crucially for warm-starting - makes it
 * identical no matter which of the two edges sharing that point produced
 * it.
 */
function vertexFeatureId(edgeCount: number, vertexIndex: number): number {
  return edgeCount + vertexIndex;
}

/**
 * Resolves a contact that clamped to one of a surface edge's two endpoints.
 *
 * The endpoint is shared with a neighboring edge (`ghost`, absent only at
 * the two ends of the chain), which is what makes this the one place a
 * chain can report a bogus normal: if the neighbor's own perpendicular foot
 * falls inside its span, the neighbor owns the contact and reports it as a
 * plain face contact, so reporting it here as well would double it up with
 * a normal tilted away from the actual ground. The circle's center
 * projecting onto the neighbor's far endpoint (`ghost.farPoint`) is exactly
 * that condition.
 * @param vertex - The shared endpoint, in local space.
 * @param vertexIndex - The endpoint's index within the terrain's points.
 * @param ownNormal - The owning edge's outward normal.
 * @param ghost - The neighboring edge's outward normal and far endpoint, or
 * `null` at either end of the chain.
 * @param localCenter - The circle's center, in the terrain's local space.
 * @param radius - The circle's radius.
 * @param edgeCount - The number of edges in the terrain's surface chain.
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
): SurfaceContact | null {
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
    // direction below would point further *into* the ground. Pushing out
    // along whichever of the two faces it is least far behind is the
    // shortest way back to the surface.
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
 * Finds a circle's contact against a single edge of the terrain's surface
 * chain, in the terrain's own local space: a face contact when the circle's
 * center projects onto the edge's own span, and otherwise a contact clamped
 * to whichever endpoint it fell past (see {@link vertexContact}).
 * @param surface - The terrain's surface chain.
 * @param edgeIndex - The index of the edge to test.
 * @param localCenter - The circle's center, in the terrain's local space.
 * @param radius - The circle's radius.
 * @returns The contact, or `null` if this edge isn't the one that owns it.
 */
function contactAgainstEdge(
  surface: readonly TerrainSurfaceEdge[],
  edgeIndex: number,
  localCenter: Vector2,
  radius: number,
): SurfaceContact | null {
  const edge = surface[edgeIndex];

  // Clone before subtracting: `edge.start`/`edge.end` are the collider's own
  // stored points and `localCenter` is reused for every other edge.
  const edgeVector = Vec2.subtract(Vec2.clone(edge.end), edge.start);
  const toCenter = Vec2.subtract(Vec2.clone(localCenter), edge.start);
  const projection =
    Vec2.dot(toCenter, edgeVector) / Vec2.magnitudeSquared(edgeVector);

  if (projection <= 0) {
    const previous = edgeIndex > 0 ? surface[edgeIndex - 1] : null;

    return vertexContact(
      edge.start,
      edgeIndex,
      edge.normal,
      previous === null
        ? null
        : { normal: previous.normal, farPoint: previous.start },
      localCenter,
      radius,
      surface.length,
    );
  }

  if (projection >= 1) {
    const next = edgeIndex < surface.length - 1 ? surface[edgeIndex + 1] : null;

    return vertexContact(
      edge.end,
      edgeIndex + 1,
      edge.normal,
      next === null ? null : { normal: next.normal, farPoint: next.end },
      localCenter,
      radius,
      surface.length,
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
 * Finds every contact a circle has against the terrain's surface chain, in
 * the terrain's own local space.
 *
 * Which surface features are in contact is decided purely by the geometry -
 * an edge reports a contact only when the circle actually reaches the part
 * of the surface that edge owns - so there is no comparison between
 * candidates to be decided by floating-point noise, and no single "winning"
 * edge to flip between from tick to tick. A circle resting on flat ground
 * or on a ridge produces exactly one contact; one wedged into a valley
 * produces one per side it touches.
 * @param terrainCollider - The terrain to test against.
 * @param localCenter - The circle's center, in the terrain's own local space.
 * @param radius - The circle's radius.
 * @returns Every contact, ordered left to right along the chain.
 */
function findSurfaceContacts(
  terrainCollider: TerrainCollider,
  localCenter: Vector2,
  radius: number,
): SurfaceContact[] {
  const { surface } = terrainCollider;
  const contacts: SurfaceContact[] = [];
  const seenFeatureIds = new Set<number>();

  for (let edgeIndex = 0; edgeIndex < surface.length; edgeIndex++) {
    const edge = surface[edgeIndex];

    if (
      localCenter.x + radius < edge.start.x ||
      localCenter.x - radius > edge.end.x
    ) {
      continue;
    }

    const contact = contactAgainstEdge(surface, edgeIndex, localCenter, radius);

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
 * Detects the collisions between a circle-collider body and a
 * terrain-collider body, against the terrain's surface chain (see
 * {@link TerrainSurfaceEdge}). The terrain's solid slab is never tested, so
 * a contact normal always comes from the ground's actual surface and never
 * from an interior boundary between two neighboring surface edges.
 *
 * A circle deep enough under the terrain to have passed out of the bottom
 * of its slab is treated as having fallen through, exactly as it would have
 * with a closed slab, rather than being dragged all the way back up to the
 * surface.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns One manifold per surface feature the circle touches (entity ids
 * not yet populated, normals pointing from `circleBody` toward
 * `terrainBody`), ordered left to right along the terrain, or an empty
 * array if the shapes don't overlap.
 */
export function detectCircleTerrainCollision(
  circleBody: CollisionBody,
  terrainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const circleCollider = circleBody.collider as CircleCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { radius } = circleCollider;

  // Clone before adding: `circleBody.position` is the entity's live world
  // position, so this must not mutate it.
  const localCenter = Vec2.rotate(
    Vec2.subtract(
      Vec2.add(Vec2.clone(circleBody.position), circleCollider.offset),
      terrainBody.position,
    ),
    -terrainBody.rotation,
  );

  if (localCenter.y - radius > terrainCollider.bottomY) {
    return [];
  }

  return findSurfaceContacts(terrainCollider, localCenter, radius).map(
    (contact) => ({
      // `contact.localNormal`/`contact.localPoint` are always fresh clones
      // (see `findSurfaceContacts`), so mutating them in place here is safe.
      normal: Vec2.negate(
        Vec2.rotate(contact.localNormal, terrainBody.rotation),
      ),
      depth: radius - contact.separation,
      contactPoints: [
        Vec2.add(
          Vec2.rotate(contact.localPoint, terrainBody.rotation),
          terrainBody.position,
        ),
      ],
      featureIds: [contact.featureId],
    }),
  );
}
