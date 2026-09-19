import { Vec2, Vector2 } from '../../math/index.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  TerrainCollider,
  TerrainSurfaceEdge,
} from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  clipAgainstReferenceFace,
  detectPolygonFacesCollision,
  PolygonFaces,
  PolygonFacesContact,
} from './polygon-faces-collision.js';

/**
 * Every surface edge a polygon straddles contributes its own manifold, and
 * the solver matches a contact point up with its warm-started state by
 * entity pair and feature id alone - so two edges' contact points must
 * never share an id. `detectPolygonFacesCollision` packs its own ids into
 * the low 21 bits (a flip flag at bit 20, then two face indices and a point
 * index below it), so giving each edge a stride of exactly 2^21 hands every
 * edge a range of its own with no overlap at all, however many faces the
 * shapes involved have.
 */
const featureIdEdgeStride = 2_097_152;

/**
 * How far outside an edge's valid normal range (see
 * {@link isWithinEdgeNormalRange}) a contact normal may still fall and be
 * accepted. A contact resolved against the surface edge itself comes back
 * with that edge's own normal, which only differs from it by the rounding
 * of a rotation into the terrain's local space and back - far below this -
 * while a normal that genuinely belongs to a neighboring edge's stretch of
 * surface is out by a visible fraction of a turn.
 */
const NORMAL_RANGE_TOLERANCE = 1e-6;

/**
 * The extent of a polygon in the terrain's own local space, enough to cheaply
 * reject surface edges the polygon can't possibly reach.
 */
interface LocalBounds {
  minX: number;
  maxX: number;

  /**
   * The polygon's least local y - the point furthest along the terrain's
   * outward direction, since a terrain's solid slab always extends toward
   * local +y.
   */
  minY: number;
}

function localBounds(
  worldVertices: readonly Vector2[],
  terrainBody: CollisionBody,
): LocalBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;

  for (const vertex of worldVertices) {
    // Clone before subtracting: `worldVertices` (`polygonFaces.vertices`) is
    // reused against every surface edge in the caller's loop.
    const local = Vec2.rotate(
      Vec2.subtract(Vec2.clone(vertex), terrainBody.position),
      -terrainBody.rotation,
    );

    minX = Math.min(minX, local.x);
    maxX = Math.max(maxX, local.x);
    minY = Math.min(minY, local.y);
  }

  return { minX, maxX, minY };
}

/**
 * Expresses a single surface edge as world-space {@link PolygonFaces}, so
 * the same reference/incident face clipping that resolves every other
 * polygon-vs-polygon contact in this engine resolves a terrain contact too.
 *
 * The result is a degenerate, zero-thickness 2-gon, and deliberately gives
 * *both* of its faces the edge's one outward normal instead of an opposing
 * pair. That is what makes the edge one-sided: the separating-axis search
 * can then never pick an axis pointing back into the ground, so a body can
 * only ever be pushed out along the surface - and a body that has sunk
 * below the surface entirely is still pushed back out of it rather than
 * being reported as separated.
 */
function toWorldFaces(
  edge: TerrainSurfaceEdge,
  terrainBody: CollisionBody,
): PolygonFaces {
  // Clone before transforming: `edge.start`/`edge.end`/`edge.normal` are the
  // collider's own persistent local-space chain data, reused every tick.
  const toWorld = (vertex: Vector2): Vector2 =>
    Vec2.add(
      Vec2.rotate(Vec2.clone(vertex), terrainBody.rotation),
      terrainBody.position,
    );
  const rotateNormal = (): Vector2 =>
    Vec2.rotate(Vec2.clone(edge.normal), terrainBody.rotation);

  return {
    vertices: [toWorld(edge.start), toWorld(edge.end)],
    normals: [rotateNormal(), rotateNormal()],
  };
}

/**
 * Returns whether an outward contact normal is one this surface edge is
 * entitled to push along.
 *
 * A surface edge can only push perpendicular to itself, except at a vertex
 * where the ground bulges outward: there the two edges meeting at it leave
 * a fan of directions between their normals that neither edge's face
 * covers, and a body resting on the ridge is legitimately pushed somewhere
 * inside that fan. At a vertex where the ground folds inward there is no
 * such fan - every direction beyond this edge's own normal belongs to the
 * neighbor's face - so anything past it is the neighbor's contact to
 * report, not this edge's.
 *
 * This is what a Box2D chain shape's ghost vertices are for, and it is the
 * one thing that keeps the reference/incident face search from resolving a
 * contact against a face of the *polygon* that has nothing to do with the
 * ground under it - a body's own side face, say, brushing the very end of
 * an edge it barely overlaps, which would shove it sideways along the
 * ground instead of out of it.
 * @param surface - The terrain's surface chain.
 * @param edgeIndex - The index of the edge the contact was found against.
 * @param outwardNormal - The contact's normal, pointing from the terrain
 * toward the other body, in the terrain's own local space.
 */
function isWithinEdgeNormalRange(
  surface: readonly TerrainSurfaceEdge[],
  edgeIndex: number,
  outwardNormal: Vector2,
): boolean {
  const edge = surface[edgeIndex];
  const previous = edgeIndex > 0 ? surface[edgeIndex - 1] : null;
  const next = edgeIndex < surface.length - 1 ? surface[edgeIndex + 1] : null;

  // Walking the chain left to right, the outward normal turns
  // counter-clockwise across a vertex the ground bulges outward at, and
  // clockwise across one it folds inward at - so a positive cross product
  // between two consecutive normals is exactly "this vertex bulges
  // outward", and the neighbor's normal is the far side of the fan it
  // opens up.
  const clockwiseLimit =
    previous !== null && Vec2.cross(previous.normal, edge.normal) > 0
      ? previous.normal
      : edge.normal;
  const counterClockwiseLimit =
    next !== null && Vec2.cross(edge.normal, next.normal) > 0
      ? next.normal
      : edge.normal;

  return (
    Vec2.cross(clockwiseLimit, outwardNormal) >= -NORMAL_RANGE_TOLERANCE &&
    Vec2.cross(outwardNormal, counterClockwiseLimit) >= -NORMAL_RANGE_TOLERANCE
  );
}

/**
 * Resolves a polygon's contact against a single surface edge, as a normal
 * that edge is entitled to push along.
 *
 * The separating-axis search is free to resolve the contact against a face
 * of the *polygon* instead of against the ground, which is right when the
 * polygon is lying flat across a dip or balanced on a ridge, but wrong when
 * it lands on a face that has nothing to do with the ground underneath -
 * the body's own side face brushing the very end of an edge it barely
 * overlaps, say, which would shove it sideways along the ground rather than
 * out of it. Rather than drop such a contact and let the body sink through,
 * this falls back to clipping against the surface edge itself, which can
 * only ever push perpendicular to the ground.
 * @param polygonFaces - The polygon's world-space faces.
 * @param edgeFaces - The surface edge's world-space faces (see
 * {@link toWorldFaces}).
 * @param surface - The terrain's surface chain.
 * @param edgeIndex - The index of the edge being tested.
 * @param terrainRotation - The terrain body's world rotation, in radians.
 * @returns The contact, with its normal pointing from the polygon toward
 * the terrain, or `null` if they don't overlap.
 */
function contactAgainstEdge(
  polygonFaces: PolygonFaces,
  edgeFaces: PolygonFaces,
  surface: readonly TerrainSurfaceEdge[],
  edgeIndex: number,
  terrainRotation: number,
): PolygonFacesContact | null {
  const contact = detectPolygonFacesCollision(polygonFaces, edgeFaces);

  if (contact === null) {
    return null;
  }

  // `contact.normal` points from the polygon toward the terrain, so the
  // direction the terrain pushes the polygon is its opposite.
  const outwardNormal = Vec2.rotate(
    Vec2.negate(Vec2.clone(contact.normal)),
    -terrainRotation,
  );

  if (isWithinEdgeNormalRange(surface, edgeIndex, outwardNormal)) {
    return contact;
  }

  // The surface edge is `edgeFaces`' only face, and it is the second of the
  // two shapes, so the resulting normal is its own outward normal negated -
  // in range by construction.
  return clipAgainstReferenceFace(edgeFaces, 0, polygonFaces, true);
}

/**
 * Detects the collisions between a polygon-collider body and a
 * terrain-collider body, by running the same reference/incident face
 * clipping used for {@link detectPolygonPolygonCollision} against every
 * edge of the terrain's surface chain (see {@link TerrainSurfaceEdge}) the
 * polygon's local x-range overlaps.
 *
 * Every edge the polygon genuinely straddles contributes its own manifold,
 * rather than all of them competing for one "deepest" slot. That is what
 * makes a wide body's contact stable: an edge's manifold appears when the
 * polygon reaches that edge and disappears when it leaves, its feature ids
 * stay in a range of that edge's own, and no amount of floating-point noise
 * between two near-coplanar edges can make the pair of them trade places
 * from one tick to the next and lose their warm-started impulses.
 *
 * The terrain's solid slab is never tested, only its surface, so a contact
 * normal can never come from an interior boundary between two neighboring
 * edges, and one that would nonetheless push the polygon along the ground
 * it was found on is resolved against that ground instead (see
 * {@link contactAgainstEdge}).
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns One manifold per surface edge the polygon touches (entity ids
 * not yet populated, normals pointing from `polygonBody` toward
 * `terrainBody`), ordered left to right along the terrain, or an empty
 * array if the shapes don't overlap.
 */
export function detectPolygonTerrainCollision(
  polygonBody: CollisionBody,
  terrainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;

  const polygonFaces: PolygonFaces = {
    vertices: polygonCollider.getWorldVertices(
      polygonBody.position,
      polygonBody.rotation,
    ),
    normals: polygonCollider.getWorldNormals(polygonBody.rotation),
  };

  const { minX, maxX, minY } = localBounds(polygonFaces.vertices, terrainBody);

  // A polygon that has passed out of the bottom of the terrain's slab has
  // fallen through it, exactly as it would have with a closed slab, rather
  // than being dragged all the way back up to the surface.
  if (minY > terrainCollider.bottomY) {
    return [];
  }

  const manifolds: NarrowPhaseManifold[] = [];

  for (
    let edgeIndex = 0;
    edgeIndex < terrainCollider.surface.length;
    edgeIndex++
  ) {
    const edge = terrainCollider.surface[edgeIndex];

    if (maxX < edge.start.x || minX > edge.end.x) {
      continue;
    }

    const edgeFaces = toWorldFaces(edge, terrainBody);
    const contact = contactAgainstEdge(
      polygonFaces,
      edgeFaces,
      terrainCollider.surface,
      edgeIndex,
      terrainBody.rotation,
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
