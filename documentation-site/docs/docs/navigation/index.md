---
sidebar_position: 1
---

# Navigation

The navigation module finds paths. [`findPath`](/Forge/docs/api/functions/findPath)
runs an A\* search for the cheapest path between two nodes of any graph
that implements the
[`NavigationGraph`](/Forge/docs/api/interfaces/NavigationGraph) interface.

Everything is imported from `@forge-game-engine/forge/navigation`.

For levels made of cells, a [navigation grid](./grids.md) is a
`NavigationGraph` of walkable and blocked cells, `findGridPath` finds
a path across one between two world positions, and `smoothGridPath`
straightens that path into waypoints a unit can walk between in straight
lines.

For levels that aren't grids, a [waypoint graph](./waypoint-graphs.md) is
a `NavigationGraph` of points placed in the world and joined by
connections, and `findWaypointPath` finds a route through one between two
world positions.

A [navigation agent](./agents.md) is a component that sends a unit to a
target: a system plans its path over a grid or a waypoint graph, plans it
again when the level or the target changes, and outputs the velocity that
walks the path.

The [Path Finding demo](/Forge/demos/path-finding) bakes a grid from a
level's colliders and sends navigation agents across it.

## Graphs and nodes

A graph is a set of nodes connected by steps:

- A **node** is an integer id from `0` to `nodeCount - 1`. The graph
  decides what a node stands for, for example a grid cell (its cell index)
  or a waypoint (its point id).
- A **step** is a move from one node to a neighbor, with a cost that is
  finite and at least `0`. Steps are directed, so a connection that can be
  walked both ways is two steps.
- The **cost** of a path is the sum of its steps' costs. The cheapest path
  is the one with the lowest cost, not the fewest steps.

## How the A\* search works

The search keeps a list of nodes to search, which starts with the start
node. Each node on it has the cost of the cheapest path found to it so
far, plus the [heuristic](#the-heuristic)'s estimate of the cost from it
to the goal. The search repeatedly takes the node with the lowest total
off the list and expands it: for each step out of it, it adds the neighbor
to the list with the cost of the path through the node, when that path is
cheaper than any found to the neighbor before. The search ends when it
takes the goal off the list, and the path to the goal is then the
cheapest. Because nodes the heuristic puts closer to the goal are taken
first, the search expands fewer nodes than one that orders them by cost
alone.

## Implementing a graph

A graph is an object with three members:

- `nodeCount`: one more than the largest node id the graph uses. Ids below
  it that the graph doesn't use are allowed; they're never reported as a
  neighbor.
- `forEachNeighbor(node, visit)`: calls `visit(neighbor, cost)` once for
  each step out of `node`.
- `heuristic(node, goal)`: an estimate of the cheapest path's cost from
  `node` to `goal` (see [The heuristic](#the-heuristic)).

This graph has four points connected both ways, with the straight-line
distance between two points as the cost of a step:

```ts
import { NavigationGraph } from '@forge-game-engine/forge/navigation';

const points = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 200, y: 100 },
];
const connections = [[1], [0, 2], [1, 3], [2]];

const distance = (a: number, b: number): number =>
  Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

const graph: NavigationGraph = {
  nodeCount: points.length,
  forEachNeighbor: (node, visit) => {
    for (const neighbor of connections[node]) {
      visit(neighbor, distance(node, neighbor));
    }
  },
  heuristic: (node, goal) => distance(node, goal),
};
```

A graph must not change while `findPath` is searching it.

## The heuristic

The heuristic tells the search which nodes are likely closer to the goal,
so it expands fewer nodes. It must be finite, at least `0`, and never more
than the real cost of the cheapest path from `node` to `goal`. A
heuristic that overestimates can make `findPath` return a path that isn't
the cheapest.

- The straight-line distance is never more than the real cost when every
  step costs at least the distance it covers, as in the graph above.
- A heuristic that returns `0` for every node is always correct. The search
  then expands nodes in order of cost alone (Dijkstra's algorithm) and
  expands more of them.

## Finding a path

Call `findPath` with the graph, the start node and the goal node:

```ts
import { findPath } from '@forge-game-engine/forge/navigation';

const result = findPath(graph, 0, 3);

if (result.status === 'found') {
  // result.nodes is [0, 1, 2, 3] and result.cost is 300.
}
```

The [result](/Forge/docs/api/interfaces/FindPathResult) holds:

- `status`: how the search ended (see [Path statuses](#path-statuses)).
- `nodes`: the path from the start, both ends included.
- `cost`: the total cost of the steps in `nodes`.
- `expanded`: how many nodes the search expanded, that is, took off its
  list of nodes to search and visited the neighbors of.

`findPath` throws for an invalid argument or graph, such as a start or
goal that isn't a node id, a neighbor that isn't a node id, or a negative
step cost. It doesn't throw when there's no path.

:::note
Every search reuses one set of arrays, so a search allocates nothing per
node. The arrays grow to fit the largest search so far and are kept for as
long as the page runs:

- 24 bytes for each node of the largest graph searched.
- 20 bytes for each entry on the search's list of nodes to search. A
  search adds an entry for each node it reaches, and another each time it
  finds a cheaper path to a node it already reached. These arrays double
  in size when they fill, so they can hold up to twice as many entries as
  the largest search added.

A search that reaches every node of a 512 x 512 graph keeps 6 MB for its
nodes and at least another 5 MB for its entries.
:::

## Path statuses

`status` is one of these
[`PathStatus`](/Forge/docs/api/type-aliases/PathStatus) values:

| Status           | Meaning                                                                         | `nodes` ends at          |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------ |
| `'found'`        | The search reached the goal. `nodes` is the cheapest path.                      | The goal                 |
| `'unreachable'`  | The search reached every node it could from the start, and the goal wasn't one. | The closest node reached |
| `'limitReached'` | The search stopped after expanding `maxExpanded` nodes.                         | The closest node reached |

When the goal isn't reached, `nodes` ends at the node with the lowest
heuristic to the goal among the nodes the search took off its list (the
cheaper one to reach when two are equal). A unit can move along that path
towards the goal. When no node is closer than the start, `nodes` is
`[start]`.

## Limiting a search

A search for a goal that can't be reached visits every node reachable from
the start, which in a large graph can take longer than a frame. The
`maxExpanded` option stops the search after that many nodes have been
expanded:

```ts
const result = findPath(graph, start, goal, { maxExpanded: 1000 });

if (result.status === 'limitReached') {
  // result.nodes leads from the start towards the goal.
}
```

The default is `Infinity`, which doesn't limit the search.
