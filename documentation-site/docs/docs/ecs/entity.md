---
sidebar_position: 3
---

# Entity

An [`Entity`](../../api/classes/Entity) is a collection of related components with a unique ID.

## Creating an entity and adding it to your world

You can either create the entity and add it to the world as 2 distinct steps or you can use the [`buildAndAddEntity`](../../api/classes/World#buildandaddentity) helper on the world instance.

:::tip

Using the helper is cleaner and has less boilerplate. It is recommend that you use it unless you have a specific reason not to. It also ensures that you won't run into a [logic error](https://en.wikipedia.org/wiki/Logic_error) by forgetting to add the entity to the world after creating it.

:::

```ts title="With helper"
const playerEntity = world.buildAndAddEntity([
  new PositionComponent(10, 15),
  new ScaleComponent(),
  new RotationComponent(),
  new SpriteComponent(sprite),
  new PlayerComponent(),
]);
```

```ts title="Verbose, without helper"
const playerEntity = new Entity(world, [
  new PositionComponent(10, 15),
  new ScaleComponent(),
  new RotationComponent(),
  new SpriteComponent(sprite),
  new PlayerComponent(),
]);

world.addEntity(entity);
```

### Creating entities with parent-child relationships

You can define a parent entity at the time of creation by passing an options object with a `parent` property.

```ts title="Using Entity constructor"
const parent = new Entity(world, [new PositionComponent(100, 100)]);

// Create child with parent at construction time
const child = new Entity(world, [new PositionComponent(10, 10)], {
  parent,
});
```

```ts title="Using buildAndAddEntity helper"
const parent = world.buildAndAddEntity([
  new PositionComponent(100, 100),
]);

// Create child with parent at construction time
const child = world.buildAndAddEntity(
  'child',
  [new PositionComponent(10, 10)],
  { parent },
);
```

### Creating disabled entities

You can create entities that are initially disabled by passing an options object with `enabled: false`.

```ts title="Using buildAndAddEntity helper"
// Create a disabled entity
const disabledEntity = world.buildAndAddEntity(
  'hidden-entity',
  [new PositionComponent(0, 0)],
  { enabled: false },
);

// Enable it later when needed
disabledEntity.enabled = true;
```

```ts title="Creating disabled child with parent"
const parent = world.buildAndAddEntity([]);

// Create a disabled child entity with a parent
const child = world.buildAndAddEntity([], {
  enabled: false,
  parent,
});
```

## Adding and removing components

When creating an entity you will provide it with some initial components.
However, you will often find the need to add or remove components through out the game's lifecycle as your entity takes on new characteristics.

### Adding a component

The [`addComponent`](../../api/classes/Entity.md#addcomponent) instance method will add the component to the entity if it isn't already present.

```ts
playerEntity.addComponent(new HealthBuffComponent(100));
```

:::info

The underlying component store is a [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set). Which means that it will prevent you from accidentally adding the same component _instance_ twice.

Although it won't prevent you from adding the same _type_ of component twice. If you do this, it will likely result in some unintended behavior.

It is recommend that you do not add more than one instance of a component type to an entity. If you feel like you need to do this, consider the pattern used in the [animation feature](https://github.com/Forge-Game-Engine/Forge/tree/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/animations).

:::

### Removing a component

The [`removeComponent`](../../api/classes/Entity.md#removecomponent) instance method will remove the component from the entity if it is present.

```ts
playerEntity.removeComponent(HealthBuffComponent);
```

## Disabling an Entity

If you want to temporarily disable an entity, you can do so by setting the [`enabled`](../../api/classes/Entity.md#enabled-1) property.
This means it will be ignored when sending entities to the systems.

```ts
playerEntity.enabled = false;
```

You can re-enable it later by setting it to true

```ts
playerEntity.enabled = true;
```

## Querying an entity for components

There are several ways to query for components on a specific entity.

### Check if an entity has a list of components

If you want to check if an entity contains a list of components, you can use the [`containsAllComponents`](../../api/classes/Entity.md#containsallcomponents) instance method.

```ts
const canBeFullyTransformed = playerEntity.containsAllComponents([
  PositionComponent,
  RotationComponent,
  ScaleComponent
]);

if (canBeFullyTransformed) {
  ...
}
```

### Get a single component

If you want to get a single component. You can use the [`getComponent`](../../api/classes/Entity.md#getcomponent) or the [`getComponentRequired`](../../api/classes/Entity.md#getcomponentrequired) instance methods.

The `getComponent` method will return the component if it exists or `null` if it does not exist.

```ts
const scaleComponent = playerEntity.getComponent(ScaleComponent);

if (scaleComponent) {
  // scaleComponent could be null
  // if the player entity has a scale, double it!
  scaleComponent.x *= 2;
  scaleComponent.y *= 2;
}
```

The `getComponentRequired` method will return the component if it exists or throw an error if it does not exist.

```ts
const scaleComponent = playerEntity.getComponentRequired(ScaleComponent); // will throw if the player does not have a scale

// the player entity definitely has a scale, double it!
scaleComponent.x *= 2;
scaleComponent.y *= 2;
```

:::info

Although there are legitimate use-cases for `getComponent`. You should always use `getComponentRequired` over `getComponent` if you expect the entity to have a specific component. It prevents the need to do null checks and also ensures that your game will not silently fail if the component is missing.

:::
