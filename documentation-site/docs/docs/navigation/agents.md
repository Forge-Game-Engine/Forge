---
sidebar_position: 5
---

# Navigation agents

A navigation agent sends a unit to a target. The
[`NavigationAgentEcsComponent`](/Forge/docs/api/interfaces/NavigationAgentEcsComponent)
holds where the unit is going, and
[`createNavigationAgentEcsSystem`](/Forge/docs/api/functions/createNavigationAgentEcsSystem)
plans its path, plans it again when needed, and writes the velocity that
walks the path to the agent's `desiredVelocity`. The agent doesn't move
the entity: the game applies `desiredVelocity` in a system of its own.

## Adding an agent

An agent needs a [path planner](/Forge/docs/api/interfaces/PathPlanner)
and a `speed` in world units a second. A planner wraps one
[grid](./grids.md#planning-a-units-path) or
[waypoint graph](./waypoint-graphs.md#planning-a-units-path), and every
agent that walks it can share it:

```ts
import {
  addNavigationAgentComponent,
  createGridPathPlanner,
} from '@forge-game-engine/forge/navigation';

const planner = createGridPathPlanner(grid);

const agent = addNavigationAgentComponent(world, unit, {
  planner,
  speed: 120,
  arrivalRadius: 16,
});
```

The entity also needs a `PositionEcsComponent`; the system reads its
`position.world`.

## Setting a target

Game code sets `target` to a world position, or to `null` to stop:

```ts
agent.target = { x: 640, y: 380 };

// Later:
agent.target = null;
```

The system compares `target` with the target the path was planned for by
value each tick, so assigning a new position and changing `target.x` or
`target.y` in place both plan a new path. With `target` set to `null`, the
agent's `status` is `'idle'`, its `path` is empty and its
`desiredVelocity` is zero.

## Agent statuses

The system writes the agent's `status`:

- `'idle'`: `target` is `null`.
- `'planning'`: the agent is waiting for a path (see
  [The planning budget](#the-planning-budget)). It keeps walking the path
  it has, if any.
- `'moving'`: the agent is walking its path.
- `'arrived'`: the agent reached the end of a path that was found. It
  stays `'arrived'`, with a zero `desiredVelocity`, until `target`
  changes.
- `'unreachable'`: no path reaches the target. The agent walks to the end
  of the path, the reachable place nearest the target, and stops there.

The system also writes `path` (the world positions the agent walks
through, starting where it was when the path was planned), `waypointIndex`
(the index in `path` of the point it's walking to) and `pathStatus` (how
the search ended). Game code reads these fields and doesn't write them.

When the target is inside a blocked cell, a grid planner moves the goal
to the nearest walkable cell, and the agent arrives at that cell's centre.
To check that a unit stands on the exact target, compare its position with
`target`.

## Applying the desired velocity

`desiredVelocity` is a world-space velocity. For an entity with a rigid
body, copy it into the body's `velocity`, and physics integration moves
the entity and resolves its collisions:

```ts
import type { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  type NavigationAgentEcsComponent,
  navigationAgentId,
} from '@forge-game-engine/forge/navigation';
import {
  type RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';

const createUnitVelocityEcsSystem = (): EcsSystem<
  [NavigationAgentEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [navigationAgentId, rigidBodyId],
  update: (_world, { components: [agents, bodies] }) => {
    for (let i = 0; i < agents.length; i++) {
      bodies[i].velocity.x = agents[i].desiredVelocity.x;
      bodies[i].velocity.y = agents[i].desiredVelocity.y;
    }
  },
});
```

For an entity without a rigid body, add it to the local position, scaled
by the frame's duration:

```ts
position.local.x += agent.desiredVelocity.x * time.deltaTimeInSeconds;
position.local.y += agent.desiredVelocity.y * time.deltaTimeInSeconds;
```

On the last tick before the target, `desiredVelocity` is the velocity that
moves the entity exactly onto it in `time.deltaTimeInSeconds`, so either
way the entity stops on the target. The velocity is in world space, so a
unit with a parent converts it into its parent's space first.

## Registering the system

Register the systems in this order:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { createNavigationAgentEcsSystem } from '@forge-game-engine/forge/navigation';

// 1. Systems that set targets, and anything that changes the grid or graph.
world.addSystem(createTransformEcsSystem());
world.addSystem(createNavigationAgentEcsSystem(time));
world.addSystem(createUnitVelocityEcsSystem());
// 2. The physics systems, from gravity to integration.
```

The agent system runs after `createTransformEcsSystem`, so the
`position.world` it steers from includes the movement physics integration
wrote to `position.local` on the previous tick. The game's system that
applies `desiredVelocity` runs after it and before the physics systems.
See [Registering the physics systems](../physics/index.md#registering-the-physics-systems)
for the physics order.

## Re-planning

The system plans a new path for an agent when:

- its `target` changes;
- its `planner` is replaced, or the planner's `version` changes, which a
  grid or graph does when a cell's walkability or cost, or a point or
  connection, changes;
- it is further from the segment of the path it's walking than the
  planner's `maxPathDistance`, or its own `arrivalRadius` when that is
  larger, such as after a collision pushed it off its path;
- it reaches the end of a path that the search's node limit cut short.

An `'arrived'` agent only plans again when its `target` changes.

A grid planner's `maxPathDistance` is one cell. A waypoint planner's is
`Infinity`, so an agent pushed off a connection walks straight back to its
next point; set `maxPathDistance` to about a connection's width to plan a
new path instead:

```ts
const planner = createWaypointPathPlanner(graph, { maxPathDistance: 48 });
```

## Arrival radius

`arrivalRadius` is in world units and defaults to `0`. It does two
things:

- The agent moves on to the next point of its path once it's within
  `arrivalRadius` of the current one, or has passed it, so it turns before
  each corner instead of on it.
- Over the last `arrivalRadius` of its path, the agent slows down at a
  constant rate, to a speed of `speed * sqrt(remaining / arrivalRadius)`
  for the `remaining` distance, and stops on the end.

With `arrivalRadius` `0`, the agent turns on each point and walks at
`speed` until the tick it reaches the end.

:::note
An agent that turns early can cross the corner of a cell next to a wall.
A grid baked from colliders with an `agentRadius` keeps walls that far
from every walkable cell (see
[Keeping units clear of walls](./colliders.md#keeping-units-clear-of-walls));
keep `arrivalRadius` small compared with that margin when a unit
shouldn't rub against walls.
:::

## The planning budget

Every search the system runs in one tick shares a budget of
`maxExpandedPerFrame` nodes, `2048` by default. Agents waiting for a path
are planned in the order they started waiting, then in the order their
entities were created. Once the budget is used up, the rest stay
`'planning'` and are planned first on later ticks, so many agents
re-planning at once spread over several ticks and none is dropped:

```ts
world.addSystem(
  createNavigationAgentEcsSystem(time, { maxExpandedPerFrame: 1024 }),
);
```

A search that uses the whole budget on its own is kept: the agent walks
towards the nearest place it reached, and plans again from the end of that
path. Smoothing a grid path isn't counted in the budget; a planner created
with `smooth: false` skips it.
