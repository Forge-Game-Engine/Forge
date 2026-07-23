---
sidebar_position: 1
---

# Components

## LifetimeEcsComponent

Tracks an entity's lifetime and expiration status. Attach it with
`addLifetimeComponent`.

### Properties

- `durationSeconds: number` - Total lifetime duration. Has no default and
  must always be provided.
- `elapsedSeconds: number` - Current elapsed time since creation. Defaults
  to `0`.
- `hasExpired: boolean` - Set to `true` when elapsed time reaches duration by
  [`createLifetimeTrackingEcsSystem`](./systems.md#createlifetimetrackingecssystem).
  Defaults to `false`.

### Example

```ts
import { addLifetimeComponent } from '@forge-game-engine/forge/lifecycle';

// Entity that expires after 5 seconds
addLifetimeComponent(world, entity, { durationSeconds: 5 });
```

## RemoveFromWorldLifetimeStrategyId

A tag (no data) that marks an entity to be removed from the world once its
`LifetimeEcsComponent` expires, once
[`createRemoveFromWorldEcsSystem`](./systems.md#createremovefromworldecssystem)
is registered.

### Example

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';

// Create an explosion effect that gets removed from the world after 2 seconds
const explosion = world.createEntity();

addLifetimeComponent(world, explosion, { durationSeconds: 2 });
world.addTag(explosion, RemoveFromWorldLifetimeStrategyId);
```
