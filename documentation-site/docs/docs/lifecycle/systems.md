---
sidebar_position: 2
---

# Systems

## LifetimeTrackingSystem

Updates elapsed time for all entities with a `LifetimeComponent` and sets the `hasExpired` flag when the lifetime duration is reached.

### Constructor

```typescript
new LifetimeTrackingSystem(world: World)
```

### Usage

Add this system to your world before any disposal systems:

```typescript
world.addSystem(new LifetimeTrackingSystem(world));
```

### Behavior

- Increments `elapsedSeconds` on each frame based on delta time
- Sets `hasExpired` to `true` when `elapsedSeconds >= durationSeconds`
- Does not remove or modify entities (only tracks time)

## RemoveFromWorldLifecycleSystem

Removes expired entities from the world. Only processes entities that have both:

- `LifetimeComponent` (with `hasExpired` set to `true`)
- `RemoveFromWorldStrategyComponent`

### Constructor

```typescript
new RemoveFromWorldLifecycleSystem(world: World)
```

### Usage

```typescript
world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
);
```

## ReturnToPoolLifecycleSystem

Returns expired entities to their object pool and removes them from the world. Only processes entities that have both:

- `LifetimeComponent` (with `hasExpired` set to `true`)
- `ReturnToPoolStrategyComponent`

### Constructor

```typescript
new ReturnToPoolLifecycleSystem(world: World)
```

### Usage

```typescript
world.addSystems(
  new LifetimeTrackingSystem(world),
  new ReturnToPoolLifecycleSystem(world),
);
```

### Behavior

When an entity expires:

1. Calls the pool's `release()` method with the entity
2. Removes the entity from the world

The pool's dispose callback is called during `release()`, allowing you to clean up the entity state before it's returned to the pool.
