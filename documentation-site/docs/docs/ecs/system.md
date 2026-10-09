---
sidebar_position: 5
---

# System

A system is a plain object that implements
[`EcsSystem`](/Forge/docs/api/interfaces/EcsSystem): the queries it reads and
an `update` function. Each tick, the world calls `update` once with the
entities that match the system's queries.

A system declares every query it reads, and the declarations are fixed when
the system is created:

- `query`: the component keys an entity must have. Their components are
  passed to `update` in this order.
- `tags` (optional): tag keys an entity must also have.
- `without` (optional): component or tag keys an entity must not have.
- `queries` (optional): named secondary queries, each with its own `query`,
  `tags` and `without`.

The world keeps the entities matching each declaration up to date as
components are added and removed, so a tick costs time in proportion to
what changed, not to how many entities match.

## Defining a system

`update(world, queryResult)` receives the tick's matches in one batch:
`queryResult.entities` holds the matched entity handles, and
`queryResult.components` holds one array per key in `query`, in `query`
order, so `components[0][i]` is the `query[0]` component of `entities[i]`.

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';

const movementSystem: EcsSystem<[Position, Velocity]> = {
  name: 'movement',
  query: [positionId, velocityId],
  update(world, { entities, components: [positions, velocities] }) {
    for (let i = 0; i < entities.length; i++) {
      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
    }
  },
};
```

`update` is called once per tick whether zero, one or many entities match,
so work that runs once per tick, or that needs every match at once (sorting,
spatial partitioning, batching), goes directly in `update`. `name` is
optional and identifies the system in error messages.

The order of `entities` is unspecified. A system that needs an order sorts
the entities itself.

An empty `query` with no `tags` matches no entity. A system that only does
work once per tick, such as spawning, declares `query: []`.

## Registering a system

`world.addSystem` registers a system, and every later `world.update()`
runs it:

```ts
world.addSystem(movementSystem);
```

Adding a system that's already registered throws.
[World](world.md#adding-a-system) covers ordering systems with
`before`/`after`, system groups, and removing a system.

## Excluding entities with `without`

`without` lists component or tag keys that an entity must not have. An
entity that gains one of them stops matching, and an entity that loses it
matches again:

```ts
const movementSystem: EcsSystem<[Position, Velocity]> = {
  query: [positionId, velocityId],
  without: [frozenId],
  update(world, { entities, components: [positions, velocities] }) {
    // Entities with the frozen tag aren't in entities.
  },
};
```

An excluded entity costs the system nothing per tick, unlike an `if` in its
loop.

## Reading other entities with secondary queries

A system that also reads a different set of entities, such as a star that
checks every player's basket, declares a named secondary query in `queries`.
`update` receives the secondary results as its third argument, under the
same names. The second type argument of `EcsSystem` types them:

```ts
const starSystem: EcsSystem<[Star, Position], { players: [Player, Position] }> =
  {
    query: [starId, positionId],
    queries: {
      players: { query: [playerId, positionId] },
    },
    update(world, { entities, components: [stars, positions] }, { players }) {
      const [playerComponents, playerPositions] = players.components;

      // ...compare each star with each player...
    },
  };
```

Each secondary result has the same shape as the primary one. Don't call
`world.query` inside `update`: it scans the world and builds new arrays on
every call. `world.query` is for code that runs outside a system's
`update` (see [Querying for entities](world.md#querying-for-entities)).

## Looking up optional components in a loop

`query` only matches entities that have every listed component, so a
component that only some of the entities have can't be in `query`. Read it
with `world.getComponent` inside the loop:

```ts
const system: EcsSystem<[Sprite]> = {
  query: [spriteId],
  update(world, { entities, components: [sprites] }) {
    for (let i = 0; i < entities.length; i++) {
      const rotation = world.getComponent(entities[i], rotationId);
      // ...use sprites[i] and rotation, which is null if entities[i] has none...
    }
  },
};
```

`getComponent` looks up the component's storage on every call.
`world.getComponentAccessor(componentKey)` looks it up once and returns an
`entity => component | null` function. Call it once at the top of `update`,
not once per entity:

```ts
const system: EcsSystem<[Sprite]> = {
  query: [spriteId],
  update(world, { entities, components: [sprites] }) {
    const getRotation = world.getComponentAccessor(rotationId);

    for (let i = 0; i < entities.length; i++) {
      const rotation = getRotation(entities[i]);
      // ...use sprites[i] and rotation...
    }
  },
};
```

## Reacting to entities that start or stop matching

Each query result also lists what changed since the system last ran:

- `added`: the entities that started matching. On the system's first run,
  every matching entity.
- `removed`: the entities that stopped matching. They may no longer be
  alive, so don't read their components.

A system that keeps something per entity outside the ECS (a GPU slot, a
physics proxy, a DOM element owned by a service) creates it for each entity
in `added` and frees it for each entity in `removed`:

```ts
update(world, { added, removed }) {
  for (const entity of removed) {
    proxies.destroy(entity);
  }

  for (const entity of added) {
    proxies.create(entity);
  }
}
```

Process `removed` before `added`:

- An entity that stopped matching and then matched again since the last run
  is in both lists.
- An entity whose component was replaced with another object (with
  `addComponent` on a key it already has) is in both lists, unless it
  started matching since the last run, when it's only in `added`. Adding the
  object it already has isn't a change.
- An entity that started and stopped matching between two runs is in
  neither.

Each entity is in each list at most once. A system that didn't run on some
ticks (see [Run conditions](#run-conditions)) gets everything that changed
since it last ran.

## Detecting changed values with change ticks

The journals report entities that start or stop matching, not changes to a
component's fields. For a value that a reader needs to know changed, such as
a world transform, the value's owner stamps it with the world's change tick
when it changes it, and readers compare the stamp with their own last run.

`world.changeTick` advances by one just before each system runs, so every
system run has its own tick. `queryResult.lastRunTick` is the change tick of
the system's previous run (`0` on its first):

```ts
// The owner, when the value actually changes:
transform.world.changedTick = world.changeTick;

// A reader:
update(world, { components: [transforms], lastRunTick }) {
  for (const transform of transforms) {
    if (transform.world.changedTick > lastRunTick) {
      // Changed since this system last ran.
    }
  }
}
```

A reader sees each change once, whether it runs before or after the owner
in the tick, and a reader that didn't run on some ticks sees the changes
made while it was skipped. Only the owner writes the stamp, and only when
the value changed.

## Run conditions

A run condition is a function `(world: EcsWorld) => boolean`. Passed as
`runIf` to `addSystem`, it decides on each tick whether the system runs:

```ts
world.addSystem(spawnerSystem, { runIf: () => !settings.isPaused });
```

- The world calls the condition each tick, immediately before the system
  would run, so it reads values written by earlier systems in the same tick.
- When it returns `false`, `update` isn't called. The system's `added` and
  `removed` keep collecting until it next runs.
- A system registered without `runIf` runs on every tick.

`addSystemGroup` also takes `runIf`. The group's condition is called once
per tick, before the group runs. When it returns `false`, none of the
group's systems run and their own conditions aren't called. A system in a
group runs when both conditions return `true`.

A run condition doesn't change a system's queries. `cleanup` runs when the
system is removed or the world stops, whatever its run condition.

`inState`, `onEnter` and `onExit` create run conditions from a
[game state](../states/index.md).

## Changing the world from a system

The arrays in a query result belong to the world and are reused from tick to
tick. They don't change while the `update` that received them runs, so a
system can add or remove components and entities while it loops over them.
Don't keep the arrays after `update` returns.

The changes take effect immediately: `getComponent`, `isAlive` and the
systems that run later in the same tick see them. The system itself sees
them in its own results on its next run.

Removing an entity also removes its descendants, which can appear later in
the same arrays. Check `world.isAlive` before acting on an entity in a loop
that removes entities (see
[Removing an entity from the world](world.md#removing-an-entity-from-the-world)).

When one system must run before or after another, order them with
`addSystem`'s `before`/`after` options (see
[Ordering systems](world.md#ordering-systems-with-beforeafter)).

## What a system keeps between runs

A system keeps nothing between runs itself. Its closure holds the services
and configuration its factory received, and nothing written during one run
that a later run reads:

- State a later run needs goes in a component: on the entities it's about
  (like a text field's caret blink), or in the subsystem's
  [singleton component](world.md#singleton-components).
- Caches of GPU, audio or DOM resources belong to the service that owns the
  resource, such as the `RenderContext`.
- Scratch arrays that are fully written before they're read each run may
  be kept to avoid allocating, on the service or the singleton. Never keep
  them in module scope, which every world on the page shares.

State in components can be inspected, scoped to a game state and removed
like any other component, and a system that's removed and added again, or
added to a second world, starts from what the components hold.

A value has one writer: the system that owns it. Two patterns sit beside
that rule:

- A per-frame message stream is a list on a singleton that several systems
  append to during a frame, such as "what was hit". No system edits or
  removes another's entry, one owning system clears it once per frame
  before the writers run, and readers run after the writers.
- A single-consumer queue is a list that any code appends to and one system
  reads and empties each time it runs, such as a game state's requested
  transition.

## Acquiring and releasing resources

A system can implement two optional hooks:

- `onRegister(world)` runs once, when `world.addSystem` registers the
  system.
- `cleanup(world)` runs once, when the system is removed with
  `world.removeSystem`, and when the world is stopped with `world.stop()`
  (which [`Game.stop()`](game.md#stopping-the-game) calls).

Use them for resources the system acquires outside the ECS, such as DOM
event listeners, and to add the subsystem's singleton if it doesn't exist
yet. `cleanup` doesn't receive a query result; read what it needs to
release with `world.query` or `world.getSingleton`.
