---
sidebar_position: 2
---

# World

[`EcsWorld`](/Forge/docs/api/classes/EcsWorld) holds a set of entities,
their components and tags, and the systems that process them. It:

- creates and removes entities
- stores component data grouped by component key
- stores registered systems
- answers queries for entities by component keys and tags
- runs its systems when you call `update()` (one world tick)

## Creating a new entity in the world

Creating an entity returns a handle (a number) that you use when adding components or tags.
The entity stays alive until you remove it with `removeEntity`, whether or not it has
any components.

```ts
import { EcsWorld } from '@forge-game-engine/forge/ecs';

const world = new EcsWorld();
const entity = world.createEntity();

// entity is a number (the first one is 0)
```

## Removing an entity from the world

To remove an entity and all of its component data, call `removeEntity(entity)`.

```ts
world.removeEntity(entity);
```

This removes every component/tag the entity had, then raises `onEntityRemoved`
with the entity. The world reuses the entity's slot for a later entity, under a
new handle, so the removed entity's handle never refers to the new one.

Removing an entity also removes its children, their children, and so on (see
[Parenting entities](#parenting-entities)). They're removed first, depth first,
so `onEntityRemoved` is raised for every descendant before the entity itself.
While the descendants are removed, the entity is already not alive but still
has its components, so a remove hook or listener for a descendant can read its
ancestors' components.

For each entity, in that order:

1. Its descendants are removed.
2. The [remove hook](component.md#releasing-what-a-component-holds) of each of
   its components runs, in no particular order, while its other components can
   still be read.
3. Its remaining components and tags are removed.
4. `onEntityRemoved` is raised.

A hook or listener that throws doesn't stop the removal. The entity and all of
its descendants are still removed, and every other hook and listener runs.
Then `removeEntity` rethrows the error, or throws an `AggregateError` holding
every error if more than one threw.

A system's query result is taken before the system runs, so removing an entity
can remove other entities later in the same result: its descendants. A loop
that removes entities and then acts on later ones should check `isAlive` first:

```ts
for (const entity of entities) {
  if (!world.isAlive(entity)) {
    continue; // Removed earlier in this loop, along with its parent.
  }

  // ...
}
```

Removing an entity that's already been removed does nothing, and
`removeEntity` returns `false` instead of `true`. Use `isAlive(entity)` to check
whether an entity you're holding on to is still there. See
[Entity](entity.md#holding-on-to-other-entities).

## Parenting entities

An entity can have one parent and any number of children. A child's
transform follows its parent's (see
[Transforms](../common/transforms.md)), and it's removed along with its
parent. The world keeps the hierarchy, so set and clear parents through it:

```ts
world.setParent(child, parent); // child is now a child of parent
world.getParent(child); // parent
world.getChildren(parent); // [child]
world.removeParent(child); // child is a root entity again
```

- `setParent` replaces any parent the child already has, and keeps its local
  transform, so the child takes the same offset under its new parent. It
  throws if either entity isn't alive, or if the new parent is the child itself
  or one of its descendants.
- `getChildren` lists the children in sibling order (see
  [Ordering siblings](#ordering-siblings)). Removing a child, or moving it to
  another parent, keeps the rest in order. The list is the world's own, and
  changes as children come and go, so copy it
  (`[...world.getChildren(parent)]`) before removing or reparenting children in
  a loop.
- To keep a child when its parent is removed, call `removeParent` (or
  `setParent` with another parent) first.

The parent is stored as a `ParentEcsComponent` (`parentId`), so systems can
query for it, but only the world writes it: adding it with `addComponent` or
removing it with `removeComponent` throws.

### Ordering siblings

A parent's children have an order, the order `getChildren` returns them in.
Children draw in this order (see
[Draw Order](../rendering/draw-order.md)), and UI layout groups arrange them
in it. `setParent` appends a child, so children start in the order they were
parented. To place a child elsewhere, call
[`setSiblingIndex`](/Forge/docs/api/classes/EcsWorld#setsiblingindex) after
parenting it:

```ts
world.setParent(first, parent);
world.setParent(second, parent);
world.setParent(inserted, parent); // [first, second, inserted]

world.setSiblingIndex(inserted, 1); // [first, inserted, second]
world.getSiblingIndex(inserted); // 1
```

- `setSiblingIndex` moves the child to `index` and shifts the siblings from
  that index on one place later. An `index` at or past the last sibling moves
  the child last.
- Both methods throw for an entity that has no parent. `setSiblingIndex` also
  throws for an `index` that's negative or not an integer.

## Adding a component to the entity

Components are identified by component keys (symbols) created with `createComponentId`.
Use `addComponent(entity, componentKey, data)` to attach component data to an entity.
Adding a component (or tag) to an entity that's been removed throws. Adding a
component the entity already has replaces it, and runs the key's remove hook
with the old value.

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';

const Position = createComponentId<{ x: number; y: number }>('Position');

world.addComponent(entity, Position, { x: 0, y: 0 });
```

See the [Component docs](component.md) for details on creating and typing component keys.

## Removing a component from the entity

Remove a component with `removeComponent(entity, componentKey)`, which then runs
the key's remove hook, if it has one. The entity stays alive even if it has no
components left; call `removeEntity` to remove it.

```ts
world.removeComponent(entity, Position);
```

## Tagging an entity

A tag is a component with no data. Create a tag key with `createTagId(name)`
and call `addTag(entity, tagKey)` to mark an entity with the tag.

```ts
import { createTagId } from '@forge-game-engine/forge/ecs';

const Selected = createTagId('Selected');
world.addTag(entity, Selected);
```

Tags aren't returned in the `components` array passed to a system's `update`
method, but queries can require them. `removeComponent(entity, tagKey)`
removes a tag. See [Component](component.md#tags).

## Querying for entities

You can query the world directly for entity ids (and their component data) that
have a set of component keys using `query(componentKeys, tags?)`. It returns an
object with an `entities` array and a `components` array (one array per queried
component key, in query order).

```ts
const {
  entities,
  components: [positions],
} = world.query([Position]);

for (let i = 0; i < entities.length; i++) {
  // do something with positions[i]
}
```

:::caution
Each `query` call builds new arrays of every matching entity and component.
For per-frame processing, register a system with a `query` instead of
calling `world.query` every frame.
:::

## Adding a system

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

`name` is optional. It identifies the system in error messages, such as
an ordering error.

:::info[Systems With No Ordering Constraint]
When multiple systems are registered with no ordering relationship between
them, the world preserves insertion order. Systems added earlier run before
systems added later.
:::

:::info[Adding a System During a World Tick]
If a system is added while the world is running its systems during
`update()`, it doesn't run in the current tick. It runs from the next tick.
:::

### Ordering systems with `before`/`after`

Order a system relative to specific other systems by passing
`before`/`after` to `addSystem`. Every system referenced this way must
already be registered.

```ts
const gravitySystem = { name: 'gravity', query: [RigidBody], update() {} };
world.addSystem(gravitySystem);

// integrationSystem runs after gravitySystem
const integrationSystem = {
  name: 'integration',
  query: [RigidBody, Position],
  update() {},
};
world.addSystem(integrationSystem, { after: [gravitySystem] });
```

`before`/`after` can each take multiple systems, and ordering is
transitive: if C is `after` B and B is `after` A, C runs after A too, even
though C never references A. Registering a
`before`/`after` relationship that would create a cycle, or that references a
system that hasn't been registered yet, throws.

### Grouping systems

A system group is a named set of systems that is ordered as a unit: a whole
group runs before or after another group, without `before`/`after` between
the individual systems. Register a group with `addSystemGroup`
before adding systems into it, then pass `group` to `addSystem`.

```ts
import { createSystemGroup } from '@forge-game-engine/forge/ecs';

const aiGroup = createSystemGroup('ai');
world.addSystemGroup(aiGroup, { before: [world.defaultSystemGroup] });

world.addSystem(perceptionSystem, { group: aiGroup });
world.addSystem(decisionSystem, {
  group: aiGroup,
  after: [perceptionSystem],
});
```

Every `EcsWorld` has a `defaultSystemGroup`, which `addSystem` registers a
system into when you don't specify a `group`. A group ordered relative to
`world.defaultSystemGroup` (as above) runs before or after every system
registered without a `group`, including systems added later.

Two groups that are both ordered only `before` (or only `after`) the default
group have no order between them, so they run in the order they were
registered. Order one against the other when it matters. This includes the
group [`registerFixedUpdate`](../common/time.md#running-systems-at-a-fixed-rate)
returns, which is where physics and other fixed-rate work goes.

`before`/`after` passed to `addSystem` can only reference systems in the same
group; ordering systems across different groups is done by ordering their
groups against each other instead.

### The first group

`world.firstSystemGroup` runs before every other group on every tick.
Ordering a group `before` it throws. A game state's transition system and
`registerInputs`' input update run in it.

A group registered with `after` containing `firstSystemGroup`, or containing
another group registered that way, is a start-of-tick group. Start-of-tick
groups run after the first group and before every other group, including
groups registered earlier or later. A `GameState`'s `exitGroup` and
`enterGroup` are start-of-tick groups.

```ts
const loadLevelGroup = createSystemGroup('load-level');

world.addSystemGroup(loadLevelGroup, { after: [world.firstSystemGroup] });
```

Registering a start-of-tick group with `after` containing a group that isn't
a start-of-tick group throws. Registering any other group with `before`
containing a start-of-tick group throws.

### Run conditions

`addSystem` and `addSystemGroup` take a `runIf` function that decides, each
tick, whether the system or group runs. See
[System](./system.md#run-conditions).

### Repeating a group

`addSystemGroup` also takes a `runWhile` condition. The world calls it before
each run of the group and runs the group's systems again while it returns
`true`, so the group runs zero or more times in its place in the tick:

```ts
const messageGroup = createSystemGroup('messages');

world.addSystemGroup(messageGroup, {
  before: [world.defaultSystemGroup],
  runWhile: () => messageQueue.length > 0,
});

world.addSystem(handleNextMessageSystem, { group: messageGroup });
```

- The condition is called once more than the group runs, including when the
  group has no systems. It may change the state it reads (here, a system
  removes a message from the queue; `time.consumeFixedStep()` takes a fixed
  step), which is what ends the loop. A condition that never returns `false`
  makes `update` never return.
- Each run queries every system's entities again, and each system's own
  `runIf` is checked on every run.
- All runs of the group happen before the next group in the tick starts.
- The list of the tick's groups and systems is taken before the first group
  runs: a system added during a run first runs on the next tick, and a
  system removed during a run still runs in the remaining runs of that tick.

A group can't have both `runIf` and `runWhile`: `addSystemGroup` throws when
both are passed, or when one is passed for a group already registered with
the other. Put `runIf` on the group's systems instead.

[`registerFixedUpdate`](../common/time.md#running-systems-at-a-fixed-rate)
registers a group that repeats once per fixed step.

## Running a world tick

Call `world.update()` to run the registered systems for a single frame. For
each run of a system's group, the world queries the system's `query` (and
`tags`) and invokes its `update` once with the batch of matches, regardless
of how many entities matched (including zero). A group runs once per tick
unless it has a `runWhile` condition. A system or group whose `runIf`
returns `false` is skipped, and the skipped system isn't queried.

A [`Game`](game.md) calls `update()` on its worlds every frame. Call
`update()` directly to run one tick without a `Game`, for example in a unit
test.

```ts
// advance one tick in a test
world.update();
```

## Removing a system

Remove a system with `removeSystem(system)`.

```ts
world.removeSystem(moverSystem);
```

:::info[Removing a System During a World Tick]
If a system is removed while the world is running its systems during
`update()`, it still runs in the current tick: the world takes the tick's
list of systems before running the first one. Its `cleanup` runs when
`removeSystem` is called.
:::
