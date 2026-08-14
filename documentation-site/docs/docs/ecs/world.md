---
sidebar_position: 2
---

# World

`EcsWorld` is the central coordinator for ECS in the engine. It:

- stores component data grouped by component key
- stores registered systems
- allows you to query for entities by component keys and tags
- runs systems when you call `update()` (this is the world tick)

## Creating a new entity in the world

Creating an entity returns a numeric id that you use when adding components or tags.

```ts
import { EcsWorld } from '@forge-game-engine/forge/ecs';

const world = new EcsWorld();
const entity = world.createEntity();

// entity is a number (e.g. 0)
```

## Removing an entity from the world

To remove an entity and all of its component data, call `removeEntity(entity)`.
The world will free the entity id for reuse.

```ts
world.removeEntity(entity);
```

This removes every component/tag the entity had and marks the id as available.

## Adding a component to the entity

Components are identified by component keys (symbols) created with `createComponentId`.
Use `addComponent(entity, componentKey, data)` to attach component data to an entity.

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';

const Position = createComponentId<{ x: number; y: number }>('Position');

world.addComponent(entity, Position, { x: 0, y: 0 });
```

See the [Component docs](component.md) for details on creating and typing component keys.

## Removing a component from the entity

Remove a component with `removeComponent(entity, componentKey)`. If this was the
last component on the entity, the entity will be removed from the world.

```ts
world.removeComponent(entity, Position);
```

## Tagging an entity

Tags behave like lightweight, boolean components. Create a tag key with
`createTagId(name)` and call `addTag(entity, tagKey)` to mark an entity with the tag.

```ts
import { createTagId } from '@forge-game-engine/forge/ecs';

const Enemy = createTagId('Enemy');
world.addTag(entity, Enemy);
```

Tags differ from normal components in that they carry no payload (they are stored
internally as a boolean) and are not returned as part of the `components` array
passed to a system's `update` method. They are similar in that they are indexed by
the world and can be used in queries. See the [Component docs](component.md)
for details on component keys and tag creation.

## Querying for entities

You can query the world directly for entity ids (and their component data) that
have a set of component keys using `query(componentKeys, tags?)`. It returns an
object with an `entities` array and a `components` array (one array per queried
component key, in query order).

```ts
const { entities, components: [positions] } = world.query([Position]);

for (let i = 0; i < entities.length; i++) {
  // do something with positions[i]
}
```

Prefer using systems and `query` declarations rather than manual queries in
application code. Manual queries have a runtime cost and often indicate that
logic that should live in a system is being executed ad-hoc; consult the
[Component docs](component.md) for patterns.

:::caution
Calling `query` frequently or on large component sets can be
expensive. Use systems with declared `query` arrays for per-frame processing.
:::

## Add a system

Create a system object that declares a `query` (component keys), optional `tags`,
and an `update(world, queryResult)` method. Register it with `addSystem(system, options?)`.

```ts
const moverSystem = {
  name: 'mover',
  query: [Position, Velocity] as const,
  update(world, { entities, components: [positions, velocities] }) {
    for (let i = 0; i < entities.length; i++) {
      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
    }
  },
};

world.addSystem(moverSystem);
```

`name` is optional, but giving your systems one makes any ordering error
messages (see below) much easier to read.

:::info[Systems With No Ordering Constraint]
When multiple systems are registered with no ordering relationship between
them, the world preserves insertion order. Systems added earlier run before
systems added later.
:::

:::info[Adding a System During a World Tick]
If a system is added while the world is iterating systems during `update()`,
it will not run as part of the current tick. Newly added systems become active
on the next tick.
:::

### Ordering systems with `before`/`after`

Rather than an arbitrary numeric priority, order a system relative to
specific other systems by passing `before`/`after` to `addSystem`. Every
system referenced this way must already be registered.

```ts
const gravitySystem = { name: 'gravity', query: [RigidBody], update() {} };
world.addSystem(gravitySystem);

// integrationSystem always runs after gravitySystem, regardless of where
// either one sits in your setup code
const integrationSystem = {
  name: 'integration',
  query: [RigidBody, Position],
  update() {},
};
world.addSystem(integrationSystem, { after: [gravitySystem] });
```

`before`/`after` can each take multiple systems, and the world resolves
transitive dependencies for you - if C is `after` B and B is `after` A, C runs
after A too, even though C never references A directly. Registering a
`before`/`after` relationship that would create a cycle, or that references a
system that hasn't been registered yet, throws.

### Grouping systems

A system group is a named, coarser unit of ordering: order a whole group of
systems relative to another group, instead of wiring up `before`/`after`
between every individual system. Register a group with `addSystemGroup`
before adding systems into it, then pass `group` to `addSystem`.

```ts
import { createSystemGroup } from '@forge-game-engine/forge/ecs';

const physicsGroup = createSystemGroup('physics');
world.addSystemGroup(physicsGroup, { before: [world.defaultSystemGroup] });

world.addSystem(gravitySystem, { group: physicsGroup });
world.addSystem(integrationSystem, {
  group: physicsGroup,
  after: [gravitySystem],
});
```

Every `EcsWorld` has a `defaultSystemGroup`, which is where `addSystem` puts
a system when you don't specify a `group`. Order your own groups relative to
`world.defaultSystemGroup` (as above) to consistently run before or after
every system a caller registers without specifying a group - useful for
infrastructure that must run first or last regardless of what game code adds
later, the same role the old `SystemRegistrationOrder.early`/`late` priorities
used to serve.

`before`/`after` passed to `addSystem` can only reference systems in the same
group; ordering systems across different groups is done by ordering their
groups against each other instead.

## Remove a system

Remove a system with `removeSystem(system)`.

```ts
world.removeSystem(moverSystem);
```

:::info[Removing a System During a World Tick]
If a system is removed while the world is iterating systems during `update()`,
it will still run as part of the current tick. The removal is only committed at the end of the update cycle.
:::

## Executing a world tick

Call `world.update()` to run the registered systems for a single frame. For
each registered system, the world queries `query` (and `tags`) and invokes the
system's `update` exactly once with the batch of matches, regardless of how
many entities matched (including zero).

In normal usage you don't call `update()` manually. The main loop in `Game` calls it for you every frame. Calling `update()` directly is useful for unit tests.

```ts
// advance one tick in a test
world.update();
```

## World setup example

A minimal setup showing `createGame`, creating an entity, adding a component and
registering a system:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import { createComponentId } from '@forge-game-engine/forge/ecs';

const { world } = createGame('demo-container');

const Position = createComponentId<{ x: number; y: number }>('Position');

const entity = world.createEntity();
world.addComponent(entity, Position, { x: 12, y: 10 });

const logPositionSystem = {
  query: [Position],
  update(world, { components: [positions] }) {
    for (const position of positions) {
      console.log(`position: [${position.x}, ${position.y}]`); // prints: "position: [12, 10]" every frame
    }
  },
};

world.addSystem(logPositionSystem);
```
