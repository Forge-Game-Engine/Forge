---
sidebar_position: 5
---

# World

The [`World`](../../api/classes/World) class is the central manager in the Entity-Component-System (ECS) architecture. It is responsible for holding all entities and systems, coordinating updates, and managing the lifecycle of your game's logic.

The world:

- **Stores all entities and systems:** The world keeps track of every [`Entity`](../ecs/entity.md) and [`System`](../ecs/system.md) in your game.
- **Runs systems:** On each update, the world finds all entities that match each system's [`query`](../ecs/query.md) and calls the system's `run` method for each matching entity.
- **Manages entity and system lifecycles:** You can add, remove, or build entities and systems at runtime..

## Creating a World

To use ECS, you first create a world instance:

```ts
const world = new World();
```

## Adding Systems

Systems define the logic that operates on entities with specific components.

```ts
const movementSystem = new MovementSystem();
const renderSystem = new RenderSystem();

world.addSystems(movementSystem, renderSystem);
```

## Adding Entities

Entities are added to the world either by building them with the helper:

```ts
const player = world.buildAndAddEntity('player', [
  new PositionComponent(0, 0),
  new SpriteComponent(sprite),
]);
```

Or by creating them directly and then adding:

```ts
const enemy = new Entity('enemy', world, [new PositionComponent(10, 5)]);
world.addEntity(enemy);
```

## Updating the World

To run your game logic, call `world.update()` each frame:

```ts
function gameLoop() {
  world.update();
  requestAnimationFrame(gameLoop);
}
gameLoop();
```

This will run all enabled systems on all enabled entities that match each system's query.

## Removing Entities and Systems

You can remove entities and systems at any time:

```ts
world.removeEntity(player);
world.removeSystem(movementSystem);
```

## Stopping the World

When you want to clean up (e.g., on game over or scene change), call:

```ts
world.stop();
```

This will call `stop()` on all systems and clear all entities.

## Listening for Changes

You can register callbacks to react to changes in the world's entities or systems:

```ts
world.onEntitiesChanged((entities) => {
  console.log('Entities changed:', entities);
});

world.onSystemsChanged((systems) => {
  console.log('Systems changed:', systems);
});
```

You can remove these callbacks with `removeOnEntitiesChangedCallback` and `removeOnSystemsChangedCallback`.