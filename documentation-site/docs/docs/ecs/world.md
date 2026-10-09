---
sidebar_position: 2
---

# World

[`EcsWorld`](/Forge/docs/api/classes/EcsWorld) holds a set of entities,
their components and tags, and the systems that process them. It:

- creates and removes entities
- stores component data grouped by component key
- stores registered systems, and keeps the entities matching each system's
  declared queries up to date
- answers ad-hoc queries for entities by component keys and tags
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
While the descendants' events are raised, the entity is already not alive but
still has its components, so a listener for a descendant can read its
ancestors' components.

A system's query result doesn't change while the system runs, so removing an
entity can remove other entities later in the same result: its descendants. A
loop that removes entities and then acts on later ones should check `isAlive`
first:

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
- `getChildren` lists the children in the order they were parented. Removing a
  child, or moving it to another parent, keeps the rest in order. The list is
  the world's own, and changes as children come and go, so copy it
  (`[...world.getChildren(parent)]`) before removing or reparenting children in
  a loop.
- To keep a child when its parent is removed, call `removeParent` (or
  `setParent` with another parent) first.

The parent is stored as a `ParentEcsComponent` (`parentId`), so systems can
query for it, but only the world writes it: adding it with `addComponent` or
removing it with `removeComponent` throws.

## Adding a component to the entity

Components are identified by component keys (symbols) created with `createComponentId`.
Use `addComponent(entity, componentKey, data)` to attach component data to an entity.
Adding a component (or tag) to an entity that's been removed throws.

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';

const Position = createComponentId<{ x: number; y: number }>('Position');

world.addComponent(entity, Position, { x: 0, y: 0 });
```

See the [Component docs](component.md) for details on creating and typing component keys.

## Removing a component from the entity

Remove a component with `removeComponent(entity, componentKey)`. The entity stays
alive even if it has no components left; call `removeEntity` to remove it.

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

## Singleton components

A singleton is a component that exactly one entity has, holding state a
whole subsystem shares, such as the input manager. `addSingleton` creates
an entity, adds the component to it and returns the component;
`getSingleton` reads it in constant time:

```ts
const scoreId = createComponentId<{ points: number }>('score');

world.addSingleton(scoreId, { points: 0 });

// In a system:
world.getSingleton(scoreId).points += 10;
```

- `addSingleton` throws if an entity already has the component.
- `getSingleton` throws if no entity, or more than one, has the component.
  `tryGetSingleton` returns `null` when none has it.

A singleton is an ordinary component on an ordinary entity: `removeEntity`
removes it, a `StateScopedEcsComponent` scopes it to a game state, and
systems' queries match it.

## Querying for entities

Code that runs outside a system's `update` (setup code, `cleanup`, DOM event
handlers, functions game code calls, tests) can query the world directly for
entity ids (and their component data) that have a set of component keys using
`query(componentKeys, tags?)`. It returns a
[`QueryMatches`](/Forge/docs/api/interfaces/QueryMatches): an `entities` array
and a `components` array (one array per queried component key, in query
order).

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
Each `query` call scans the world and builds new arrays of every matching
entity and component. Don't call it inside a system's `update`: declare the
query on the system instead (see
[Reading other entities with secondary queries](system.md#reading-other-entities-with-secondary-queries)).
:::

## Adding a system

Create a system object that declares a `query` (component keys), optional
`tags`, `without` and secondary `queries`, and an `update(world, queryResult)`
method (see [System](system.md)). Register it with
`addSystem(system, options?)`. The world reads the declarations once, here,
and finds the entities that already match.

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
an ordering error. Adding a system that's already registered throws.

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

const physicsGroup = createSystemGroup('physics');
world.addSystemGroup(physicsGroup, { before: [world.defaultSystemGroup] });

world.addSystem(gravitySystem, { group: physicsGroup });
world.addSystem(integrationSystem, {
  group: physicsGroup,
  after: [gravitySystem],
});
```

Every `EcsWorld` has a `defaultSystemGroup`, which `addSystem` registers a
system into when you don't specify a `group`. A group ordered relative to
`world.defaultSystemGroup` (as above) runs before or after every system
registered without a `group`, including systems added later.

`before`/`after` passed to `addSystem` can only reference systems in the same
group; ordering systems across different groups is done by ordering their
groups against each other instead.

### The first group

`world.firstSystemGroup` runs before every other group on every tick.
Ordering a group `before` it throws.

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

## Running a world tick

Call `world.update()` to run the registered systems for a single frame. For
each registered system, the world advances `world.changeTick`, patches the
system's query results with what changed since it last ran, and invokes the
system's `update` exactly once with the batch of matches, regardless of how
many entities matched (including zero). A system or group whose `runIf`
returns `false` is skipped.

The order systems run in is worked out once and kept until a system or group
is added or removed.

A [`Game`](game.md) calls `update()` on its worlds every frame. Call
`update()` directly to run one tick without a `Game`, for example in a unit
test.

```ts
// advance one tick in a test
world.update();
```

## Removing a system

Remove a system with `removeSystem(system)`. Its query results and their
`added`/`removed` journals are discarded, so a system added again starts
over, with every match in `added`.

```ts
world.removeSystem(moverSystem);
```

:::info[Removing a System During a World Tick]
If a system is removed while the world is running its systems during
`update()`, it still runs in the current tick: the world takes the tick's
list of systems before running the first one. Its `cleanup` runs when
`removeSystem` is called.
:::
