---
sidebar_position: 3
---

# Entity

An entity is simply a number (an id). It represents a unique collection of components in an `EcsWorld`. The entity itself holds no data; components attached to the entity store the data.

Common operations:

- `createEntity()` — returns a new entity id.
- `removeEntity(entity)` — removes an entity and all its components.
- `addComponent(entity, key, data)` — attach typed data to an entity.
- `getComponent(entity, key)` — returns component data or `null` if absent.
- `removeComponent(entity, key)` — removes a single component from an entity.

Example:

```ts
const world = new EcsWorld();
const entity = world.createEntity();

const Position = createComponentId<{ x: number; y: number }>('Position');
world.addComponent(entity, Position, { x: 5, y: 10 });

const pos = world.getComponent(entity, Position);
if (pos) {
	console.log('Position:', pos.x, pos.y);
}

world.removeComponent(entity, Position);
world.removeEntity(entity);
```