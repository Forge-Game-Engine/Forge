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
passed to a system's `run` method. They are similar in that they are indexed by
the world and can be used in queries. See the [Component docs](component.md)
for details on component keys and tag creation.

## Querying for entities

You can query the world directly for entity ids that have a set of component keys
using `queryEntities(componentKeys, outArray)`. Pass an array to collect results.

```ts
const out: number[] = [];
world.queryEntities([Position], out);
for (const id of out) {
  const position = world.getComponent(id, Position);
  // do something with position
}
```

Prefer using systems and `query` declarations rather than manual queries in
application code. Manual queries have a runtime cost and often indicate that
logic that should live in a system is being executed ad-hoc; consult the
[Component docs](component.md) for patterns.

:::caution
Calling `queryEntities` frequently or on large component sets can be
expensive. Use systems with declared `query` arrays for per-frame processing.
:::

## Add a system

Create a system object that declares a `query` (component keys), optional `tags`,
an optional `beforeQuery(world)` and a `run(result, world, beforeQueryResult)`
method. Register it with `addSystem(system, registrationOrder)`.

```ts
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';

const moverSystem = {
  query: [Position, Velocity] as const,
  run(result, world) {
    const [position, velocity] = result.components;
    
    position.x += velocity.x;
    position.y += velocity.y;
  },
};

world.addSystem(moverSystem, SystemRegistrationOrder.normal);
```

:::info[Default Registration Order]
If you omit the `registrationOrder` the system is added with
`SystemRegistrationOrder.normal`. Use `early`/`normal`/`late` (from `SystemRegistrationOrder`) to control ordering.
:::

:::info[Systems Sharing The Same Registration Order]
When multiple systems are registered with the same numeric order the world
preserves insertion order. Systems added earlier will run before systems
added later. Internally the world sorts systems by the numeric priority first
and uses the registration sequence as a stable tie-breaker, so equal-priority
systems keep their original registration ordering.
:::

:::info[Adding a System During a World Tick]
If a system is added while the world is iterating systems during `update()`,
it will not run as part of the current tick. Newly added systems become active
on the next tick.
:::

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

Call `world.update()` to run the registered systems for a single frame. The
world calls each system's `beforeQuery` (if present) and then iterates matching
entities, invoking the system's `run` for each match.

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
 run(result) {
  const [position] = result.components;
  console.log(`position: [${position.x}, ${position.y}]`); // prints: "position: [12, 10]" every frame
 },
};

world.addSystem(logPositionSystem);
```