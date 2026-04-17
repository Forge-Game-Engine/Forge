---
sidebar_position: 4
---

# Components

A component is a simple data container. It has no logic.
There are 2 types of components; standard components and tags.

## Standard components

Standard components hold data that influences how an entity might behave 

To create a standard component, you will need to create an interface that describes the pieces of data you component will contain. These pieces of data ad known as properties and are generally considered to be mutable [mutable](https://web.mit.edu/6.005/www/fa15/classes/09-immutability/#mutability).

```ts
interface FireEcsComponent {
  temperature: float;
  color: Color;
}
```

Then you will need to create an ID for your component, this ID is sometimes referred to as a "component key". 

```ts
const fireId = createComponentId<FireEcsComponent>('fire');
```

The ID is used to quickly store and retrieve your components data from the ECS world. 

Components are meant to be composed together to make an entity. Try to find a balance between grouping related data together that will be updated together and having too much data coupled together in one component.
Components should be small and represent one concept.

To add a component to an entity:

```ts
world.addComponent(planetEntity, positionId, {
  world: Vector2.zero,
  local: Vector2.zero,
});
```

## Tags 

Tags are simply components that do not have any properties and are used to distinguish 2 entities that would otherwise have the same set of standard components. This is particularly useful when you have 1 standard component that needs to be mutated differently based on some strategy. For example, you might have a game where there is a "player" entity and some amount of "enemy" entities. But some enemies are other human players and others are AI players. if you wanted a system to control AI behavior you might have an AI tag that can be attached to AI enemies. 

To create a tag, you will not need an interface (as there is no data), but you will still need to create an ID.

```ts
const aiPlayerId = createTagId('ai-player');
```

To add a tag to an entity:

```ts
world.addTag(enemyEntity, aiPlayerId);
```
