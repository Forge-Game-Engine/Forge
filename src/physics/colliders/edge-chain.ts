import { Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';

/**
 * One edge of a chain shape's outline (a `TerrainCollider`'s surface or a
 * `ChainCollider`'s loops), in the shape's local space.
 *
 * Collision treats a chain shape as its edges, never as closed pieces, so
 * a body wide enough to span several edges only meets the outline itself:
 * there is no interior face between two neighboring edges for it to catch
 * on. An edge's neighbors ({@link previous} and {@link next}) act as its
 * "ghost" geometry, as a Box2D chain shape's neighboring segments do: they
 * decide which of two edges sharing a vertex owns a contact near it, and
 * which directions a contact normal may take there, so the same physical
 * contact is never reported twice with two different normals.
 */
export interface ChainEdge {
  /**
   * The edge's first endpoint, in local space.
   *
   * This aliases the owning collider's own point rather than copying it, so
   * it must never be mutated.
   */
  readonly start: Vector2;

  /**
   * The edge's second endpoint, in local space.
   *
   * This aliases the owning collider's own point rather than copying it, so
   * it must never be mutated.
   */
  readonly end: Vector2;

  /**
   * The edge's unit-length outward normal, in local space: perpendicular to
   * `start`-`end`, turned from the edge's direction towards `-Y` for an
   * edge running along `+X`, and pointing away from the shape's solid side.
   */
  readonly normal: Vector2;

  /**
   * The index of the edge before this one in the chain, whose `end` is this
   * edge's `start`, or `null` at the start of an open chain.
   */
  readonly previous: number | null;

  /**
   * The index of the edge after this one in the chain, whose `start` is
   * this edge's `end`, or `null` at the end of an open chain.
   */
  readonly next: number | null;

  /**
   * The index of `start` among the chain's distinct vertices (from `0` up
   * to {@link EdgeChain.vertexCount}). Two edges that share a vertex give it
   * the same index.
   */
  readonly startVertex: number;

  /**
   * The index of `end` among the chain's distinct vertices.
   */
  readonly endVertex: number;
}

/**
 * A chain shape's edges and the queries that find the ones near a box or a
 * segment, all in the shape's local space. Collision detection, raycasts
 * and sweeps use the queries, so they only visit the edges near the other
 * shape, however many edges the chain has.
 *
 * Read it from `TerrainCollider.surface` or `ChainCollider.outline`; the
 * colliders build it.
 */
export interface EdgeChain {
  /**
   * The chain's edges. Their indices are the ones the queries return and
   * {@link ChainEdge.previous}/{@link ChainEdge.next} refer to.
   */
  readonly edges: readonly ChainEdge[];

  /**
   * The number of distinct vertices the edges run between.
   */
  readonly vertexCount: number;

  /**
   * The bounding box of every edge, in local space.
   */
  readonly bounds: Aabb;

  /**
   * Finds every edge whose bounding box overlaps `bounds` (touching
   * counts).
   * @param bounds - The box to test, in the chain's local space. Its bounds
   * may be infinite.
   * @returns The edges' indices, ascending.
   */
  queryEdges(bounds: Aabb): number[];

  /**
   * Finds every edge whose bounding box the segment from `start` to `end`
   * reaches (touching counts).
   * @param start - The segment's start, in the chain's local space.
   * @param end - The segment's end, in the chain's local space.
   * @returns The edges' indices, ascending.
   */
  queryEdgesAlongSegment(start: Vector2, end: Vector2): number[];
}
