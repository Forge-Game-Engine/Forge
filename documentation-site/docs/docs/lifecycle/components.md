---
sidebar_position: 1
---

# Components

## LifetimeComponent

Tracks an entity's lifetime and expiration status.

### Properties

- `elapsedSeconds: number` - Current elapsed time since creation
- `durationSeconds: number` - Total lifetime duration
- `hasExpired: boolean` - Set to `true` when elapsed time reaches duration by the [LifetimeTrackingSystem](./systems.md#lifetimetrackingsystem)

### Example

```typescript
// Entity that expires after 5 seconds
const lifetime = new LifetimeComponent(5);
```

## RemoveFromWorldStrategyComponent

Marks an entity to be removed from the world when its lifetime expires.

### Example

```typescript
// Create an explosion effect that gets removed from the world after 2 seconds
world.buildAndAddEntity([
  new LifetimeComponent(2),
  new RemoveFromWorldStrategyComponent(),
  new SpriteComponent(explosionSprite),
  new PositionComponent(x, y),
]);
```

## ReturnToPoolStrategyComponent

Marks an entity to be returned to an object pool when its lifetime expires, enabling entity reuse for better performance.

### Example

```typescript
const pool = new ObjectPool<Entity>({
  createCallback: (): Entity =>
    world.buildAndAddEntity([
      new PositionComponent(0, 0),
      new SpriteComponent(blueCircleSprite),
      new LifetimeComponent(1),
      new ReturnToPoolStrategyComponent(pool),
    ]),
  disposeCallback: (entity: Entity) => {
    entity.enabled = false;
  },
  hydrateCallback: (entity: Entity) => {
    entity.enabled = true;
    const lifetimeComponent = entity.getComponentRequired(LifetimeComponent);
    lifetimeComponent.reset(1);
  },
});

setInterval(() => {
  pool.getOrCreate();
}, 500);

world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
  new ReturnToPoolLifecycleSystem(),
);
```
