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
