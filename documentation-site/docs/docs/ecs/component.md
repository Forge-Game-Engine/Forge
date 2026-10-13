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

## Releasing what a component holds

A component that holds something to release, such as a GPU geometry, a
DOM element or a playing sound, gets a remove hook. Pass it to
`createComponentId` as `onRemove`:

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';
import { Geometry } from '@forge-game-engine/forge/rendering';

interface RopeEcsComponent {
  geometry: Geometry;
}

const ropeId = createComponentId<RopeEcsComponent>('rope', {
  onRemove: (world, entity, rope) => {
    rope.geometry.dispose();
  },
});
```

Every world calls the hook with the world, the entity and the value
whenever a value stops being an entity's component:

- `world.removeComponent(entity, ropeId)` removes it.
- `world.removeEntity` removes the entity, or one of its ancestors. The
  hook runs while the entity's other components can still be read, though
  the entity is no longer alive (see
  [World](world.md#removing-an-entity-from-the-world)).
- `world.addComponent(entity, ropeId, otherRope)` replaces it with a
  different value. Adding the same value again runs nothing.

The hook runs on replacement as well as on removal, as Bevy's `on_replace`
hook does. Bevy's `on_remove`, flecs's `OnRemove` and EnTT's `on_destroy`
don't run on replacement.

The value is no longer stored when the hook runs, so read it from the
hook's argument: `world.getComponent(entity, ropeId)` returns `null`, or
the new value when it was replaced. Stopping the world or removing a system
runs no hooks, since neither removes a component.

A hook belongs to the component type, so every world calls it, whichever
systems are registered. It works only with its arguments and keeps nothing
of its own. It can remove other components or entities, and their hooks
run straight away. Tags have no hooks.
