import { Vector2 } from '../../math/vector2.js';
import { NavigationGraph } from '../navigation-graph.js';

/**
 * Options for {@link WaypointGraph.connect} and
 * {@link WaypointGraph.disconnect}.
 */
export interface WaypointConnectionOptions {
  /**
   * Whether the call covers both directions, `a` to `b` and `b` to `a`, or
   * only `a` to `b`. Defaults to `true`.
   */
  bidirectional?: boolean;
}

/**
 * Points in the world joined by connections, for levels that aren't grids:
 * road networks, rooms joined by doors, jump links. Build one with
 * {@link createWaypointGraph}.
 *
 * **Graph.** A waypoint graph is a {@link NavigationGraph} whose node ids
 * are its point ids, so {@link findPath} can search it;
 * {@link findWaypointPath} does that from world positions. A step follows a
 * connection into an enabled point and costs the world distance between the
 * two points times the cost of the point it enters, so a path's cost is its
 * world length, weighted by the points it enters. Steps out of a disabled
 * point are still reported, so a unit standing on a point that's disabled
 * can leave it. The heuristic is the straight-line distance times the
 * lowest cost of any point, so it never overestimates.
 *
 * **Ids.** A point's id is a non-negative integer below `nodeCount`. A
 * removed point's id is handed out again by a later `addPoint`, least
 * recently freed first, so don't keep an id after removing its point.
 */
export interface WaypointGraph extends NavigationGraph {
  /**
   * One more than the largest point id in use or freed: the most points the
   * graph has held at once.
   */
  readonly nodeCount: number;

  /** The number of points in the graph, enabled or not. */
  readonly pointCount: number;

  /**
   * Starts at `0` and increases by one after each call that changes a
   * point or a connection, so something holding a path can tell the graph
   * has changed since it searched. A call that changes nothing, such as
   * enabling an enabled point, leaves it alone.
   */
  readonly version: number;

  /**
   * Adds an enabled point with no connections. Its id is the least recently
   * freed id of a removed point, or `nodeCount` when none is free.
   * @param position - Its world position, copied.
   * @param cost - How much more entering it costs per unit of distance than
   * entering a point of cost `1`. Defaults to `1`.
   * @returns The point's id.
   * @throws An error if `position` isn't finite or `cost` isn't finite and
   * more than `0`.
   */
  addPoint(position: Vector2, cost?: number): number;

  /**
   * Removes a point and every connection into or out of it. Its id may be
   * returned by a later `addPoint`.
   * @param id - The point's id.
   * @throws An error if the point isn't in the graph.
   */
  removePoint(id: number): void;

  /**
   * Checks whether an id is the id of a point in the graph.
   * @param id - The id.
   * @returns `true` if a point has the id.
   */
  hasPoint(id: number): boolean;

  /**
   * Reads a point's position.
   * @param id - The point's id.
   * @returns A copy of its world position.
   * @throws An error if the point isn't in the graph.
   */
  getPosition(id: number): Vector2;

  /**
   * Moves a point. Its connections follow it.
   * @param id - The point's id.
   * @param position - Its new world position, copied.
   * @throws An error if the point isn't in the graph or `position` isn't
   * finite.
   */
  setPosition(id: number, position: Vector2): void;

  /**
   * Reads a point's cost.
   * @param id - The point's id.
   * @returns How much more entering it costs per unit of distance than
   * entering a point of cost `1`.
   * @throws An error if the point isn't in the graph.
   */
  getCost(id: number): number;

  /**
   * Sets a point's cost.
   * @param id - The point's id.
   * @param cost - How much more entering it costs per unit of distance than
   * entering a point of cost `1`.
   * @throws An error if the point isn't in the graph, or `cost` isn't
   * finite and more than `0`.
   */
  setCost(id: number, cost: number): void;

  /**
   * Checks whether steps may enter a point.
   * @param id - The point's id.
   * @returns `true` if the point is enabled.
   * @throws An error if the point isn't in the graph.
   */
  isEnabled(id: number): boolean;

  /**
   * Enables or disables a point. A disabled point keeps its position, cost
   * and connections, but no step enters it and `closestPoint` skips it, so
   * a door can close without rebuilding the graph.
   * @param id - The point's id.
   * @param enabled - Whether steps may enter it.
   * @throws An error if the point isn't in the graph.
   */
  setEnabled(id: number, enabled: boolean): void;

  /**
   * Lists the graph's points.
   * @returns A new array of the ids of every point, in increasing order.
   */
  getPointIds(): number[];

  /**
   * Connects two points. A connection that already exists is left alone,
   * so connecting one way never removes the other way.
   * @param a - The point the connection starts from.
   * @param b - The point the connection goes to.
   * @param options - Whether it goes both ways.
   * @throws An error if either point isn't in the graph, or `a` is `b`.
   */
  connect(a: number, b: number, options?: WaypointConnectionOptions): void;

  /**
   * Removes the connection from `a` to `b`, and from `b` to `a` unless
   * `bidirectional` is `false`. A connection that doesn't exist is ignored.
   * @param a - The point the connection starts from.
   * @param b - The point the connection goes to.
   * @param options - Whether both ways are removed.
   * @throws An error if either point isn't in the graph.
   */
  disconnect(a: number, b: number, options?: WaypointConnectionOptions): void;

  /**
   * Checks whether a step goes from one point to another.
   * @param a - The point the step starts from.
   * @param b - The point the step goes to.
   * @returns `true` if `a` has a connection to `b`.
   * @throws An error if either point isn't in the graph.
   */
  isConnected(a: number, b: number): boolean;

  /**
   * Lists the points a point has a connection to.
   * @param id - The point's id.
   * @returns A new array of their ids, in the order they were connected,
   * disabled points included.
   * @throws An error if the point isn't in the graph.
   */
  getConnections(id: number): number[];

  /**
   * Finds the enabled point nearest a world position.
   * @param position - The world position.
   * @returns The point's id, the lowest when several are as near, or `null`
   * if the graph has no enabled point.
   * @throws An error if `position` isn't finite.
   */
  closestPoint(position: Vector2): number | null;
}
