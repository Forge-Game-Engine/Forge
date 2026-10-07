---
sidebar_position: 1
---

# Components

## Giving an entity a lifetime

[`addLifetimeComponent`](/Forge/docs/api/functions/addLifetimeComponent)
attaches a [`LifetimeEcsComponent`](/Forge/docs/api/interfaces/LifetimeEcsComponent)
to an entity. `durationSeconds` is required:

```ts
import { addLifetimeComponent } from '@forge-game-engine/forge/lifecycle';

addLifetimeComponent(world, entity, { durationSeconds: 5 });
```

[`createLifetimeTrackingEcsSystem`](./systems.md#tracking-lifetimes) adds
each tick's delta time to the component's `elapsedSeconds`, and sets
`hasExpired` to `true` once `elapsedSeconds` reaches `durationSeconds`.

## Removing an entity when it expires

The [`RemoveFromWorldLifetimeStrategyId`](/Forge/docs/api/variables/RemoveFromWorldLifetimeStrategyId)
tag marks an entity to be removed from the world once its lifetime expires:

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';

const entity = world.createEntity();

addLifetimeComponent(world, entity, { durationSeconds: 2 });
world.addTag(entity, RemoveFromWorldLifetimeStrategyId);
```

[`createRemoveFromWorldEcsSystem`](./systems.md#removing-expired-entities)
removes it with `world.removeEntity` on the tick `hasExpired` becomes `true`.

## Reacting to an expired lifetime

An entity with a `LifetimeEcsComponent` and no disposal tag stays in the
world after it expires. A system reads `hasExpired` to act on it, for
example to end a temporary effect on an entity that stays in the game:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '@forge-game-engine/forge/lifecycle';

const endEffectSystem: EcsSystem<[LifetimeEcsComponent]> = {
  query: [lifetimeId],
  tags: [temporaryEffectTag],
  update(world, { entities, components: [lifetimes] }) {
    for (let i = 0; i < entities.length; i++) {
      if (lifetimes[i].hasExpired) {
        // End the effect on entities[i] here.
        world.removeComponent(entities[i], lifetimeId);
      }
    }
  },
};
```

:::caution
Don't tag an entity that must stay in the game with
`RemoveFromWorldLifetimeStrategyId`: the whole entity is removed when its
lifetime expires, not only the lifetime.
:::

## Restarting or cancelling a lifetime

The component's fields are plain data. To restart a lifetime, set
`elapsedSeconds` to `0` and `hasExpired` to `false`; the tracking system
never sets `hasExpired` back to `false` itself. To cancel a lifetime,
remove the component:

```ts
world.removeComponent(entity, lifetimeId);
```
