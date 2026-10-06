---
sidebar_position: 3
---

# Entity

An entity is a handle (a number) that `EcsWorld` uses to identify a collection
of components. Entities are not objects and hold no data themselves;
components are stored by the world and associated with the entity's handle.

An entity is alive from `createEntity()` until `removeEntity(entity)`, whether
or not it has any components. Removing its last component doesn't remove it.

:::note
Treat entity handles as opaque. Compare them with `===`, store them, and use
them as `Map`/`Set` keys, but don't do arithmetic on them. The first entities
a world creates happen to be `0`, `1`, `2`, ..., but that's not true once
entities have been removed.
:::

:::caution
Entities may only be created or removed via `EcsWorld` APIs such as
`createEntity()` and `removeEntity(entity)`. Don't make up handles yourself:
adding a component to a handle the world didn't create throws.
:::

Minimal example, create an entity and attach a component.

This demonstrates creating an entity, attaching a `Position` component,
reading the component, and removing the entity.

```ts
const world = new EcsWorld();
const entity = world.createEntity();

const Position = createComponentId<{ x: number; y: number }>('Position');
world.addComponent(entity, Position, { x: 5, y: 10 });

const position = world.getComponent(entity, Position);

if (position) {
  console.log('Position:', position.x, position.y);
}

world.removeEntity(entity);
```

## Holding on to other entities

Storing another entity's handle is safe, whether in a component field (a
`ParentEcsComponent`'s `parent`, a homing missile's `target`), a closure, or
a collection. A handle packs a slot index with a generation. When an entity
is removed, the world reuses its slot for a later entity under the next
generation, so the old handle never refers to the new entity:

- `world.isAlive(handle)` returns `false`.
- `world.getComponent(handle, key)` returns `null`.
- `world.removeEntity(handle)` does nothing and returns `false`.
- `world.addComponent(handle, ...)` and `world.addTag(handle, ...)` throw.

So code holding a handle checks whether its entity is still there, and drops
the handle once it isn't:

```ts
const homingSystem: EcsSystem<[MissileEcsComponent]> = {
  query: [missileId],
  update(world, { components: [missiles] }) {
    for (const missile of missiles) {
      if (missile.target !== null && !world.isAlive(missile.target)) {
        // The target was destroyed. Fly straight from now on.
        missile.target = null;
      }

      // ...
    }
  },
};
```

Removing an entity that may already be gone is fine. A bullet that hits two
enemies in the same tick can be removed by both collisions; the second
`removeEntity` does nothing.

:::caution
A slot's generation wraps after 1,024 reuses, so a handle held across 1,024
removals and creations of entities in the same slot would match again. The
world reuses the slot that's been free longest first, so this takes a long
time even in a game that creates and removes entities every frame. Still,
drop a handle once you know its entity is gone rather than keeping it
forever.
:::

For error messages and debugging, `formatEntity(entity)` prints a handle as its
index and generation, e.g. `12v3`. `entityIndex` and `entityGeneration` return
the two parts.
