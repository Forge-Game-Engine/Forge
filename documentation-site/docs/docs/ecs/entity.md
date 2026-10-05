---
sidebar_position: 3
---

# Entity

An entity is an opaque identifier (a number) used by `EcsWorld` to identify a
collection of components. Entities are not objects and hold no data themselves;
components are stored by the world and associated with the entity id.

:::note
Entities are simple numeric ids (for example `0`, `1`, ...). Treat them as
handles rather than objects you manipulate directly.
:::

:::caution
Entities may only be created or removed via `EcsWorld` APIs such as
`createEntity()` and `removeEntity(entity)`. Do not attempt to fabricate ids
or manage lifecycle outside the world; doing so breaks indexing and queries.
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

## Parents and children

Give an entity a parent with `addParentComponent`. A child's transform is
relative to its parent's (see [Transforms](../common/transforms.md)), and the
child lives only as long as its parent: removing an entity removes all of its
descendants too.

```ts
import {
  addParentComponent,
  EcsWorld,
  parentId,
} from '@forge-game-engine/forge/ecs';

const world = new EcsWorld();
const ship = world.createEntity();
const flame = world.createEntity();

addParentComponent(world, flame, { parent: ship });

world.removeEntity(ship); // removes `flame` too
```

`ParentEcsComponent.parent` is read-only, because the world keeps track of
each entity's children as parents are added and removed:

- **Reparent** an entity by calling `addParentComponent` again with the new
  parent. It replaces the old component.
- **Detach** an entity with `world.removeComponent(entity, parentId)`. It
  becomes a root entity and survives its old parent's removal. To keep a
  child alive when its parent is removed (an attached item the player drops
  when a ship is destroyed, say), detach it first.

```ts
world.removeComponent(flame, parentId);
world.removeEntity(ship); // `flame` stays in the world
```
