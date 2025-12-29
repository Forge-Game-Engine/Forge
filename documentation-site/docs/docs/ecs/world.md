---
sidebar_position: 2
---

# World

The [`World`](../../api/classes/World) class is the central manager in the Entity-Component-System (ECS) architecture. It is responsible for holding all entities and systems, coordinating updates, and managing the lifecycle of your game's logic.

The world:

- **Stores all entities and systems:** The world keeps track of every [`Entity`](../ecs/entity.md) and [`System`](../ecs/system.md) in your game.
- **Runs systems:** On each update, the world finds all entities that match each system's [`query`](../ecs/query.md) and calls the system's `run` method for each matching entity.
- **Manages entity and system lifecycles:** You can add, remove, or build entities and systems at runtime.
- **Hosts the [time instance](../common/time.md)**

## Creating a World

You can chose to create a world manually or using the [`createWorld`](../../api/functions/createWorld.md) utility.

```ts
const world = new World('my-world');
game.registerWorld(world);

// or using the utility

const { world } = createWorld('my-world', game);
```

:::tip

If you're using the [`createWorld`](../../api/functions/createWorld.md) utility, it will automatically add the world to your game.

:::

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
const player = world.buildAndAddEntity([
  new PositionComponent(0, 0),
  new SpriteComponent(sprite),
]);
```

Or by creating them directly and then adding:

```ts
const enemy = new Entity(world, [new PositionComponent(10, 5)]);
world.addEntity(enemy);
```

## Querying Entities

There are many ways to query the world for a specific entity.

:::warning

Querying the world is an expensive operation as the query loops through all the entities in the world.

Do not query in loops (including the [`run`](../../api/classes/System.md#run) and [`beforeAll`](../../api/classes/System.md#beforeall) system methods). Cache queried values where possible.

:::

### Querying for multiple Entities

If you want to find all the entities in the world that match a [`query`](./query.md), you can use the [`queryEntities`](../../api/classes/World.md#queryentities) method.

```ts
const world = new World('main-world');

...

const movableEntities = world.queryEntities([PositionComponent]);
```

### Querying for a single Entity

If you want to find a specific entity, usually singleton type entities (camera, inputs, etc.), in the world that match a [`query`](./query.md), you can use the [`queryEntity`](../../api/classes/World.md#queryentity) or [`queryEntityRequired`](../../api/classes/World.md#queryentityrequired) method.

```ts
const world = new World('main-world');

...
// returns Entity or null if no entity is found
const inputsEntity = world.queryEntity([InputsComponent]);

// returns Entity or throws an error no entity is found
const cameraEntity = world.queryEntityRequired([CameraComponent]);
```

:::info

Although there are legitimate use-cases for `queryEntity`. You should always use `queryEntityRequired` over `queryEntity` if you expect the entity to exist in the world at the time query is made. It prevents the need to do null checks and also ensures that your game will not silently fail if the entity is missing.

:::

:::info

If multiple entities exist in the world that match the query, only one is returned. There is no guarantee which entity will be be returned.

:::

## Removing Entities and Systems

You can remove entities and systems at any time:

```ts
world.removeEntity(player);
world.removeSystem(movementSystem);
```

## Stopping the World

When you want to clean up (e.g., on game over), call:

```ts
world.stop();
```

This will call `stop` on all systems and clear all entities.

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
