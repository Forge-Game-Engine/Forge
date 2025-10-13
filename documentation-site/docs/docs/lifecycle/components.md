# Components

## LifetimeComponent

Tracks an entity's lifetime and expiration status.

### Properties

- `elapsedSeconds: number` - Current elapsed time since creation
- `durationSeconds: number` - Total lifetime duration
- `hasExpired: boolean` - Automatically set to `true` when elapsed time reaches duration

### Constructor

```typescript
new LifetimeComponent(durationSeconds: number)
```

### Example

```typescript
// Entity that expires after 5 seconds
const lifetime = new LifetimeComponent(5.0);
```

## RemoveFromWorldStrategyComponent

Marks an entity to be removed from the world when its lifetime expires.

### Constructor

```typescript
new RemoveFromWorldStrategyComponent()
```

### Example

```typescript
// Create an explosion effect that automatically removes itself
world.buildAndAddEntity('explosion', [
  new LifetimeComponent(2.0),
  new RemoveFromWorldStrategyComponent(),
  new SpriteComponent(explosionSprite),
  new PositionComponent(x, y),
]);
```

## ReturnToPoolStrategyComponent

Marks an entity to be returned to an object pool when its lifetime expires, enabling entity reuse for better performance.

### Constructor

```typescript
new ReturnToPoolStrategyComponent<T>(pool: ObjectPool<T>)
```

### Example

```typescript
// Create a pool for bullet entities
const bulletPool = new ObjectPool<Entity>(
  [],
  () => world.buildEntity('bullet', [/* components */]),
  (bullet) => {
    // Clean up bullet state when returned to pool
    bullet.removeComponent(LifetimeComponent.symbol);
    bullet.removeComponent(ReturnToPoolStrategyComponent.symbol);
  }
);

// Create a bullet that returns to the pool after 5 seconds
const bullet = bulletPool.getOrCreate();
bullet.addComponent(new LifetimeComponent(5.0));
bullet.addComponent(new ReturnToPoolStrategyComponent(bulletPool));
world.addEntity(bullet);
```
