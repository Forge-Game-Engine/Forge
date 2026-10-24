---
sidebar_position: 4
---

# Waypoint graphs

A waypoint graph is a set of points in the world joined by connections,
for levels that aren't grids, such as road networks, rooms joined by doors
or jump links. It's a
[`NavigationGraph`](/Forge/docs/api/interfaces/NavigationGraph), so
[`findPath`](./index.md#finding-a-path) can search it, and
[`findWaypointPath`](/Forge/docs/api/functions/findWaypointPath) finds a
route between two world positions through it.

## Creating a graph

[`createWaypointGraph`](/Forge/docs/api/functions/createWaypointGraph)
returns an empty [`WaypointGraph`](/Forge/docs/api/interfaces/WaypointGraph):

```ts
import { createWaypointGraph } from '@forge-game-engine/forge/navigation';

const graph = createWaypointGraph();
```

## Adding and removing points

`addPoint(position, cost)` adds a point at a world position and returns
its id. The cost is optional and defaults to `1` (see
[Point costs](#point-costs)):

```ts
const depot = graph.addPoint({ x: 0, y: 0 });
const bridge = graph.addPoint({ x: 200, y: 0 });
const town = graph.addPoint({ x: 400, y: 0 });
```

`removePoint(id)` removes a point and every connection into or out of it.

A point's id is an integer from `0` to `nodeCount - 1`. A graph that never
removes a point gives ids `0`, `1`, `2` and so on, in the order the points
were added. A later `addPoint` gives a removed point's id to the new point,
the least recently freed id first, so `nodeCount` is the most points the
graph has held at once.

:::caution
After `removePoint(id)`, `id` can name a different point once another point
is added. Don't keep a removed point's id.
:::

`setPosition(id, position)` moves a point, and its connections move with
it.

## Connecting points

`connect(a, b)` connects two points both ways:

```ts
graph.connect(depot, bridge);
graph.connect(bridge, town);
```

`disconnect(a, b)` removes the connection both ways. Connecting points that
are already connected, or disconnecting points that aren't, changes
nothing. A point can't be connected to itself.

### One-way connections

With `bidirectional: false`, `connect` adds only the connection from `a` to
`b`, and `disconnect` removes only that one:

```ts
// A one-way street from the depot to the town.
graph.connect(depot, town, { bidirectional: false });

// Makes a two-way connection one-way, from the town to the bridge.
graph.disconnect(bridge, town, { bidirectional: false });
```

`connect` only adds connections, so `connect(a, b, { bidirectional: false })`
on a two-way connection leaves it two-way.

## Point costs

A point's cost is how much more entering it costs per unit of distance
than entering a point of cost `1`. A cost above `1` makes routes avoid the
point, for example a ford or a crowded junction, and a cost below `1` makes
routes prefer it, for example a road. A cost must be finite and more than
`0`.

```ts
const ford = graph.addPoint({ x: 200, y: 150 }, 3);

graph.setCost(ford, 2);
```

## Path costs

A step from one point to a connected point costs the world distance
between the two points times the cost of the point it enters. A route's
cost is therefore its length in world units, weighted by the costs of the
points it enters, and the cheapest route is the shortest one when every
point costs the same. The cost of the point a route starts from is never
counted.

The graph's heuristic is the straight-line distance between two points
times the lowest cost of any point in the graph. It never overestimates, so
`findPath` returns the cheapest route.

## Disabling points

`setEnabled(id, false)` disables a point without removing it. No step
enters a disabled point, so routes go around it. It keeps its position,
cost and connections, and `setEnabled(id, true)` enables it again:

```ts
graph.setEnabled(bridge, false); // The bridge is closed.

// Later:
graph.setEnabled(bridge, true);
```

Steps out of a disabled point are still taken, so a search that starts on
a point that was disabled can leave it.

## Finding the closest point

`closestPoint(position)` returns the id of the enabled point nearest a world
position, or `null` when the graph has no enabled point. When several
points are as near, it returns the lowest id.

```ts
const nearest = graph.closestPoint(unitPosition);
```

## Finding a route between world positions

`findWaypointPath(graph, fromWorld, toWorld)` finds the cheapest route from
the enabled point closest to `fromWorld` to the enabled point closest to
`toWorld`:

```ts
import { findWaypointPath } from '@forge-game-engine/forge/navigation';

const result = findWaypointPath(graph, unitPosition, targetPosition);

if (result.status === 'found') {
  for (const point of result.points) {
    // Each point is the world position of a point on the route.
  }
}
```

The [result](/Forge/docs/api/interfaces/FindWaypointPathResult) has
everything `findPath` returns (`status`, `nodes`, `cost` and `expanded`,
see [Path statuses](./index.md#path-statuses)) and:

- `points`: the world position of each point in `nodes`, in the same order.
  `fromWorld` and `toWorld` aren't in it, so a unit moves from its position
  to `points[0]` first, and from the last point to its target at the end.
- `startPointId` and `goalPointId`: the points the search ran between.

When the goal point can't be reached, `nodes` and `points` end at the
reached point nearest it. `findWaypointPath` takes `findPath`'s
`maxExpanded` option.

### Graphs with no enabled point

When the graph has no enabled point, `findWaypointPath` doesn't throw. Its
`status` is `'unreachable'`, `nodes` and `points` are empty, `cost` and
`expanded` are `0`, and `startPointId` and `goalPointId` are `null`. An
empty `nodes` means there is no route.

## Planning a unit's path

A [path planner](/Forge/docs/api/interfaces/PathPlanner) plans the whole
path a unit walks, from its own position to the target.
[`createWaypointPathPlanner`](/Forge/docs/api/functions/createWaypointPathPlanner)
creates one over a graph:

```ts
import { createWaypointPathPlanner } from '@forge-game-engine/forge/navigation';

const planner = createWaypointPathPlanner(graph);
const { status, points } = planner.planPath(unitPosition, targetPosition);
```

`planPath` runs `findWaypointPath`, puts `unitPosition` before the route's
point positions, and puts `targetPosition` after them when the route is
`'found'`. A route that doesn't reach the goal point ends at the reached
point nearest it, and a graph with no enabled point gives an empty
`points`. A planner is what a [navigation agent](./agents.md) plans with.

## Rerouting a unit when a route closes

A [navigation agent](./agents.md) plans its path again whenever its
planner's graph changes, so closing a connection reroutes every unit
whose path used it. This road network has two routes from a depot to a
town, one over a bridge and a longer one through a ford, and a vehicle
driving to the town:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addNavigationAgentComponent,
  createWaypointGraph,
  createWaypointPathPlanner,
} from '@forge-game-engine/forge/navigation';

const roads = createWaypointGraph();
const depot = roads.addPoint({ x: 0, y: 0 });
const bridge = roads.addPoint({ x: 200, y: 0 });
const town = roads.addPoint({ x: 400, y: 0 });
const ford = roads.addPoint({ x: 200, y: 150 });

roads.connect(depot, bridge);
roads.connect(bridge, town);
roads.connect(depot, ford);
roads.connect(ford, town);

const vehicle = world.createEntity();

addPositionComponent(world, vehicle, { local: { x: 0, y: 0 } });
addNavigationAgentComponent(world, vehicle, {
  planner: createWaypointPathPlanner(roads),
  speed: 80,
  target: { x: 400, y: 0 },
});
```

The vehicle's path runs over the bridge, the cheapest route. Closing the
road from the bridge to the town:

```ts
roads.disconnect(bridge, town);
```

raises the graph's `version`, so on the next tick the agent system plans a
new path over the roads still open, from the vehicle's position through
the enabled point closest to it. A vehicle that hasn't reached the bridge
yet gets a path through the ford.
`roads.setEnabled(bridge, false)` closes the bridge itself, and every road
through it, the same way. Connecting the road again, or enabling the
point, raises `version` too, and the vehicle plans the cheapest path from
where it is.

## Reading a graph

These methods read a graph back, for example to draw it:

- `getPointIds()`: the ids of every point, in increasing order.
- `getPosition(id)`, `getCost(id)` and `isEnabled(id)`: a point's values.
- `getConnections(id)`: the points `id` has a connection to, in the order
  they were connected.
- `isConnected(a, b)`: whether there's a connection from `a` to `b`.
- `hasPoint(id)` and `pointCount`: whether a point exists, and how many
  there are.

```ts
for (const id of graph.getPointIds()) {
  const from = graph.getPosition(id);

  for (const neighbor of graph.getConnections(id)) {
    const to = graph.getPosition(neighbor);
    // Draw a line from `from` to `to`.
  }
}
```

Every method that takes a point id throws when no point has that id,
except `hasPoint`.

## Searching a graph with findPath

A point's id is its node id, so a graph can be searched with `findPath`
directly:

```ts
import { findPath } from '@forge-game-engine/forge/navigation';

const result = findPath(graph, depot, town);
const positions = result.nodes.map((id) => graph.getPosition(id));
```

## Detecting changes

A graph's `version` starts at `0` and increases by one after each call that
changes a point or a connection: every `addPoint` and `removePoint`, and
each `connect`, `disconnect`, `setEnabled`, `setPosition` or `setCost` that
changes a value. Comparing it with the version a route was found at tells
whether the graph has changed since:

```ts
const routeVersion = graph.version;

// Later:
if (graph.version !== routeVersion) {
  // Find the route again.
}
```
