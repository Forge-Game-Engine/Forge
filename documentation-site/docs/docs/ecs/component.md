---
sidebar_position: 4
---

# Components

A component is plain data (no logic) that stores state for an entity.
`EcsWorld` stores components by component key and entity handle; an entity
doesn't hold its components.

## Component types

- Data components: typed objects, stored under a key created with
  [`createComponentId`](/Forge/docs/api/functions/createComponentId).
- Tags: markers with no data, stored under a key created with
  [`createTagId`](/Forge/docs/api/functions/createTagId).

## Defining a component

Define a TypeScript interface for the component's data, then create its key
with `createComponentId`. The name passed to it is used in error messages.

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';

interface VelocityEcsComponent {
  x: number;
  y: number;
}

const velocityId = createComponentId<VelocityEcsComponent>('velocity');
```

The key's type parameter types the data passed to and returned from the
world's component methods for that key.

Engine components come with an `add<Name>Component` function that builds
the component from options and adds it to an entity, for example
`addPositionComponent(world, entity, options)`.

## Adding and reading a component

`world.addComponent` attaches the data to an entity, and
`world.getComponent` returns it, or `null` if the entity doesn't have it:

```ts
world.addComponent(entity, velocityId, { x: 1, y: 0 });

const velocity = world.getComponent(entity, velocityId);

if (velocity) {
  velocity.x += 1;
}
```

Components are mutable objects: changing a field of the returned object
changes the stored component. `world.getComponentRequired` returns the
component or throws if the entity doesn't have it.

A system reads the components of every matching entity through its
`query` (see [System](system.md)). To read a component that only some of a
system's entities have, see
[Looking up optional components in a loop](system.md#looking-up-optional-components-in-a-loop).

## Tags

A tag marks an entity without adding data:

```ts
import { createTagId } from '@forge-game-engine/forge/ecs';

const selectedTag = createTagId('selected');

world.addTag(entity, selectedTag);
```

A system's `tags` limit it to entities that have every listed tag (see
[System](system.md)).

## Removing a component

`world.removeComponent` removes a component or a tag from an entity. The
entity stays alive (see [World](world.md#removing-a-component-from-the-entity)):

```ts
world.removeComponent(entity, velocityId);
world.removeComponent(entity, selectedTag);
```
