---
sidebar_position: 2
---

# Systems

## Tracking lifetimes

[`createLifetimeTrackingEcsSystem`](/Forge/docs/api/functions/createLifetimeTrackingEcsSystem)
creates the system that counts every lifetime. Register it with the game's
[`Time`](../common/time.md):

```ts
import { createLifetimeTrackingEcsSystem } from '@forge-game-engine/forge/lifecycle';

world.addSystem(createLifetimeTrackingEcsSystem(time));
```

Each tick, it adds `time.deltaTimeInSeconds` to every
`LifetimeEcsComponent`'s `elapsedSeconds`, and sets `hasExpired` to `true`
when `elapsedSeconds` is greater than or equal to `durationSeconds`. It
doesn't remove entities.

## Removing expired entities

[`createRemoveFromWorldEcsSystem`](/Forge/docs/api/functions/createRemoveFromWorldEcsSystem)
creates the system that removes expired entities tagged with
`RemoveFromWorldLifetimeStrategyId`:

```ts
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';

world.addSystem(createLifetimeTrackingEcsSystem(time));
world.addSystem(createRemoveFromWorldEcsSystem());
```

It queries entities with both a `LifetimeEcsComponent` and the tag, and
calls `world.removeEntity` for each one whose `hasExpired` is `true`.
Entities with a `LifetimeEcsComponent` and no tag aren't removed.

:::note
Register it after `createLifetimeTrackingEcsSystem` (by adding it later, or
with `after`, see [Ordering systems](../ecs/world.md#ordering-systems-with-beforeafter)).
Registered before it, an entity is removed one tick after it expires.
:::
