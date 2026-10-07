---
sidebar_position: 5
---

# System

A system is a plain object that implements
[`EcsSystem`](/Forge/docs/api/interfaces/EcsSystem): a `query` (an array of
component keys), optional `tags`, and an `update` function. Each tick, the
world calls `update` once with every entity that has all of the `query`
components and all of the `tags`.

## Defining a system

`update(world, queryResult)` receives the tick's matches in one batch:
`queryResult.entities` holds the matched entity handles, and
`queryResult.components` holds one array per key in `query`, in `query`
order, so `components[0][i]` is the `query[0]` component of `entities[i]`.

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';

const movementSystem: EcsSystem<[Position, Velocity]> = {
  name: 'movement',
  query: [positionId, velocityId],
  update(world, { entities, components: [positions, velocities] }) {
    for (let i = 0; i < entities.length; i++) {
      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
    }
  },
};
```

`update` is called once per tick whether zero, one or many entities match,
so work that runs once per tick, or that needs every match at once (sorting,
spatial partitioning, batching), goes directly in `update`. `name` is
optional and identifies the system in error messages.

## Registering a system

`world.addSystem` registers a system, and every later `world.update()`
runs it:

```ts
world.addSystem(movementSystem);
```

[World](world.md#adding-a-system) covers ordering systems with
`before`/`after`, system groups, and removing a system.

## Looking up optional components in a loop

`query` only matches entities that have every listed component, so a
component that only some of the entities have can't be in `query`. Read it
with `world.getComponent` inside the loop:

```ts
const system: EcsSystem<[Sprite]> = {
  query: [spriteId],
  update(world, { entities, components: [sprites] }) {
    for (let i = 0; i < entities.length; i++) {
      const rotation = world.getComponent(entities[i], rotationId);
      // ...use sprites[i] and rotation, which is null if entities[i] has none...
    }
  },
};
```

`getComponent` looks up the component's storage on every call.
`world.getComponentAccessor(componentKey)` looks it up once and returns an
`entity => component | null` function. Call it once at the top of `update`,
not once per entity:

```ts
const system: EcsSystem<[Sprite]> = {
  query: [spriteId],
  update(world, { entities, components: [sprites] }) {
    const getRotation = world.getComponentAccessor(rotationId);

    for (let i = 0; i < entities.length; i++) {
      const rotation = getRotation(entities[i]);
      // ...use sprites[i] and rotation...
    }
  },
};
```

## Run conditions

A run condition is a function `(world: EcsWorld) => boolean`. Passed as
`runIf` to `addSystem`, it decides on each tick whether the system runs:

```ts
world.addSystem(spawnerSystem, { runIf: () => !settings.isPaused });
```

- The world calls the condition each tick, immediately before the system
  would run, so it reads values written by earlier systems in the same tick.
- When it returns `false`, the system isn't queried and `update` isn't
  called.
- A system registered without `runIf` runs on every tick.

`addSystemGroup` also takes `runIf`. The group's condition is called once
per tick, before the group runs. When it returns `false`, none of the
group's systems run and their own conditions aren't called. A system in a
group runs when both conditions return `true`.

A run condition doesn't change a system's `query` or `tags`. `cleanup` runs
when the system is removed or the world stops, whatever its run condition.

`inState`, `onEnter` and `onExit` create run conditions from a
[game state](../states/index.md).

## Changing the world from a system

`queryResult.entities` and `queryResult.components` are computed before
`update` is called, so a system can add or remove components and entities
while it loops over them: the arrays don't change. The changes take effect
immediately, so later systems in the same tick read them.

Removing an entity also removes its descendants, which can appear later in
the same arrays. Check `world.isAlive` before acting on an entity in a loop
that removes entities (see
[Removing an entity from the world](world.md#removing-an-entity-from-the-world)).

When one system must run before or after another, order them with
`addSystem`'s `before`/`after` options (see
[Ordering systems](world.md#ordering-systems-with-beforeafter)).

## Acquiring and releasing resources

A system can implement two optional hooks:

- `onRegister(world)` runs once, when `world.addSystem` registers the
  system.
- `cleanup(world)` runs once, when the system is removed with
  `world.removeSystem`, and when the world is stopped with `world.stop()`
  (which [`Game.stop()`](game.md#stopping-the-game) calls).

Use them for resources the system acquires itself, outside of any
component, such as DOM elements or GPU render targets. `cleanup` doesn't
receive a query result, so a system that acquires a resource per entity
keeps track of what it acquired:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';

const createLabelEcsSystem = (
  container: HTMLElement,
): EcsSystem<[LabelEcsComponent]> => {
  const elements = new Map<number, HTMLElement>();

  return {
    query: [labelId],
    update(_world, { entities, components: [labels] }) {
      for (let i = 0; i < entities.length; i++) {
        let element = elements.get(entities[i]);

        if (!element) {
          element = document.createElement('div');
          container.appendChild(element);
          elements.set(entities[i], element);
        }

        element.textContent = labels[i].text;
      }
    },
    cleanup() {
      for (const element of elements.values()) {
        element.remove();
      }

      elements.clear();
    },
  };
};
```
