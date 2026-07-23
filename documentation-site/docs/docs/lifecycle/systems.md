---
sidebar_position: 2
---

# Systems

## createLifetimeTrackingEcsSystem

Updates elapsed time for all entities with a `LifetimeEcsComponent` and sets
the `hasExpired` flag when the lifetime duration is reached.

### Signature

```ts
createLifetimeTrackingEcsSystem(time: Time): EcsSystem<[LifetimeEcsComponent]>
```

### Usage

Add this system to your world before any disposal systems:

```ts
world.addSystem(createLifetimeTrackingEcsSystem(time));
```

### Behavior

- Increments `elapsedSeconds` on each frame based on `time.deltaTimeInSeconds`
- Sets `hasExpired` to `true` when `elapsedSeconds >= durationSeconds`
- Does not remove or modify entities (only tracks time)

## createRemoveFromWorldEcsSystem

Removes expired entities from the world. Only processes entities that have
both:

- `LifetimeEcsComponent` (with `hasExpired` set to `true`)
- the `RemoveFromWorldLifetimeStrategyId` tag

### Signature

```ts
createRemoveFromWorldEcsSystem(): EcsSystem<[LifetimeEcsComponent]>
```

### Usage

```ts
world.addSystem(createLifetimeTrackingEcsSystem(time));
world.addSystem(createRemoveFromWorldEcsSystem());
```
