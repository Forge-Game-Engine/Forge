import { AdjacencyListWaypointGraph } from './adjacency-list-waypoint-graph.js';
import { WaypointGraph } from './waypoint-graph.js';

/**
 * Creates an empty waypoint graph. Add points with
 * {@link WaypointGraph.addPoint} and join them with
 * {@link WaypointGraph.connect}.
 * @returns The waypoint graph.
 */
export function createWaypointGraph(): WaypointGraph {
  return new AdjacencyListWaypointGraph();
}
