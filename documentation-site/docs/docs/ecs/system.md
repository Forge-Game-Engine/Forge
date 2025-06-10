---
sidebar_position: 3
---

# System

A [`System`](../../api/classes/System) is the logic layer of the architecture. Systems are responsible for updating and processing entities that have specific components. While components hold data and entities group components, systems define **behavior**.

A system iterates over all entities that contain a required set of components and performs logic on them. For example, a `PhysicsSystem` might update the position of all entities that have both a `PositionComponent` and a `PhysicsBodyComponent`.

## Creating a system

To create a system, you extend the [`System`](../../api/classes/System) class and implement the [`run`](../../api/classes/System#run) method, which is called once per update cycle(frame) for each entity that matches the system's [`query`](../ecs/query.md). You also need to provide the [`query`](../ecs/query.md) to the [`super`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)(`System`) constructor.

```ts
export class MovementSystem extends System {
  constructor() {
    super('MovementSystem', [
      PositionComponent.symbol,
      VelocityComponent.symbol,
    ]); // the second argument is a query
  }

  public run(entity: Entity): void {
    ...
  }
}
```

:::info

The entity being passed into the run method is guaranteed to contain the components specified in the [`query`](../ecs/query.md). You should always use `getComponentRequired` over `getComponent` in this situation. More details can be found [here](../ecs/entity.md#get-a-single-component).

:::

## The run method

The run method is where you logic lives. Here is where you will read and mutate you components. 

### Early exit

If your `run` method returns `true` for an entity, the system will stop processing further entities for that update cycle. This can be useful for systems that only need to act on the first matching entity.

```ts
public run(entity: Entity): boolean | void {
  // ...logic...
  if (someCondition) {
    return true; // Stop processing further entities
  }
}
```

## Adding a system to the world

Systems are registered with the world so they can be run during the game loop.

```ts
const movementSystem = new MovementSystem();
world.addSystems(movementSystem);
```

## Enabling and disabling systems

You can temporarily disable a system by setting its `isEnabled` property to `false`. Disabled systems will not process any entities.

```ts
movementSystem.isEnabled = false; // Will not run
movementSystem.isEnabled = true;  // Will run again
```

## Pre-processing entities

Systems can override the `beforeAll` method to perform logic before processing entities, such as filtering or sorting the entity list.

```ts
public beforeAll(entities: Entity[]): Entity[] {
  // Only process enabled entities
  return entities.filter((entity) => entity.enabled);
}
```

:::warning[**You may not need to use this hook!**]

This hook causes you system to loop through entities twice. Which is not ideal for performance.

Entities will run through your system in the order that they were added to the world. If you intend on using the this function to sort entities, consider updating the registration order instead. 

Entities are already filtered (with some smart caching) by the components that they contain. If you feel the need to filter in the `beforeAll` hook consider adding a new [tag component](https://github.com/SanderMertens/ecs-faq?tab=readme-ov-file#tag) to your entities and system query to discriminate between entities.

:::

## Cleaning up a system

You can also override the `stop` method to perform cleanup when the system is stopped or removed.

```ts
public stop() {
  // Cleanup logic here
}
```