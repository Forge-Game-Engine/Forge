# Example Use Cases

## Temporary Visual Effects

Create visual effects that automatically disappear after a set duration.

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

// Create an explosion effect that lasts 2 seconds
world.buildAndAddEntity('explosion', [
  new LifetimeComponent(2.0),
  new RemoveFromWorldStrategyComponent(),
  new SpriteComponent(explosionSprite),
  new PositionComponent(x, y),
  new ScaleComponent(1, 1),
]);
```

## Timed Power-ups

Create power-ups or buffs that expire after a duration.

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

// Add a speed boost that lasts 10 seconds
function activateSpeedBoost(playerEntity: Entity) {
  world.buildAndAddEntity('speed-boost', [
    new LifetimeComponent(10.0),
    new RemoveFromWorldStrategyComponent(),
    new SpeedBoostComponent(playerEntity, 2.0), // 2x speed multiplier
  ]);
}
```

## Projectiles with Lifetime

Create bullets or projectiles that disappear after traveling for a certain time.

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

function fireBullet(x: number, y: number, directionX: number, directionY: number) {
  world.buildAndAddEntity('bullet', [
    new LifetimeComponent(3.0), // Bullet exists for 3 seconds
    new RemoveFromWorldStrategyComponent(),
    new SpriteComponent(bulletSprite),
    new PositionComponent(x, y),
    new VelocityComponent(directionX * 500, directionY * 500),
    new CollisionComponent(),
  ]);
}
```

## Pooled Entities (Advanced)

For high-performance scenarios where you frequently create and destroy entities, use object pooling to reuse entities instead of creating new ones.

```typescript
import {
  LifetimeComponent,
  ReturnToPoolStrategyComponent,
  ObjectPool,
} from '@forge-game-engine/forge';

// Create a pool for bullet entities
const bulletPool = new ObjectPool<Entity>(
  [], // Start with empty pool
  () => {
    // Create new bullet entity
    return world.buildEntity('bullet', [
      new SpriteComponent(bulletSprite),
      new PositionComponent(0, 0),
      new VelocityComponent(0, 0),
      new CollisionComponent(),
    ]);
  },
  (bullet) => {
    // Clean up when bullet returns to pool
    bullet.removeComponent(LifetimeComponent.symbol);
    bullet.removeComponent(ReturnToPoolStrategyComponent.symbol);
  }
);

// Fire a bullet using the pool
function fireBullet(x: number, y: number, vx: number, vy: number) {
  const bullet = bulletPool.getOrCreate();
  
  // Reset bullet position and velocity
  const pos = bullet.getComponent<PositionComponent>(PositionComponent.symbol)!;
  pos.x = x;
  pos.y = y;
  
  const vel = bullet.getComponent<VelocityComponent>(VelocityComponent.symbol)!;
  vel.x = vx;
  vel.y = vy;
  
  // Add lifetime components
  bullet.addComponent(new LifetimeComponent(5.0));
  bullet.addComponent(new ReturnToPoolStrategyComponent(bulletPool));
  
  world.addEntity(bullet);
}
```

## Temporary Obstacles

Create obstacles or hazards that appear and disappear on a timer.

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

function spawnTemporaryWall(x: number, y: number, duration: number) {
  world.buildAndAddEntity('temp-wall', [
    new LifetimeComponent(duration),
    new RemoveFromWorldStrategyComponent(),
    new SpriteComponent(wallSprite),
    new PositionComponent(x, y),
    new CollisionComponent(),
  ]);
}

// Wall that exists for 5 seconds
spawnTemporaryWall(100, 200, 5.0);
```
