# Lifecycle Module

The lifecycle module provides a flexible and composable system for managing entity lifetimes in your game. It separates lifetime tracking from disposal strategies, allowing you to handle entity expiration in different ways depending on your needs.

## Architecture

The lifecycle module follows a separation of concerns pattern:

1. **Lifetime Tracking**: A single system (`LifetimeTrackingSystem`) tracks elapsed time and determines when entities have expired
2. **Lifecycle Strategies**: Strategy components mark how an entity should be handled when it expires
3. **Lifecycle Handler Systems**: Separate systems handle entities based on their strategy components

This design avoids conditional logic in systems and keeps components as pure data containers.

## Core Components

### LifetimeComponent

A data-only component that tracks an entity's lifetime:

```typescript
class LifetimeComponent {
  elapsedSeconds: number; // Current elapsed time
  durationSeconds: number; // Total lifetime duration
  hasExpired: boolean; // Set to true when elapsed >= duration
}
```

### Strategy Components

Strategy components are marker components that indicate how an entity should be handled when it expires:

- **RemoveFromWorldStrategyComponent**: Removes the entity from the world
- **ReturnToPoolStrategyComponent**: Returns the entity to an object pool (for reuse)

## Core Systems

### LifetimeTrackingSystem

Updates elapsed time and sets the `hasExpired` flag when an entity's lifetime is complete:

```typescript
const lifetimeTracker = new LifetimeTrackingSystem(world);
world.addSystem(lifetimeTracker);
```

### RemoveFromWorldLifecycleSystem

Removes expired entities from the world. Queries for entities with both `LifetimeComponent` and `RemoveFromWorldStrategyComponent`:

```typescript
const removalSystem = new RemoveFromWorldLifecycleSystem(world);
world.addSystem(removalSystem);
```

### ReturnToPoolLifecycleSystem

Returns expired entities to their object pool. Queries for entities with both `LifetimeComponent` and `ReturnToPoolStrategyComponent`:

```typescript
const poolSystem = new ReturnToPoolLifecycleSystem(world);
world.addSystem(poolSystem);
```

## Common Use Cases

### Temporary Visual Effects

Create particles or effects that disappear after a set duration:

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
  LifetimeTrackingSystem,
  RemoveFromWorldLifecycleSystem,
} from '@forge-game-engine/forge';

// Add systems to your world
world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
);

// Create a temporary effect that lasts 2 seconds
world.buildAndAddEntity('explosion', [
  new LifetimeComponent(2.0), // 2 second duration
  new RemoveFromWorldStrategyComponent(),
  new SpriteComponent(explosionSprite),
  new PositionComponent(x, y),
  // ... other components
]);
```

### Particle System

Particles are a common use case for the lifecycle system:

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

function emitParticle(lifetime: number) {
  world.buildAndAddEntity('particle', [
    new LifetimeComponent(lifetime),
    new RemoveFromWorldStrategyComponent(),
    new SpriteComponent(particleSprite),
    new PositionComponent(x, y),
    new VelocityComponent(vx, vy),
    // ... other components
  ]);
}

// Emit particles with random lifetimes
emitParticle(Math.random() * 2 + 1); // 1-3 seconds
```

### Pooled Entities (Advanced)

For high-performance scenarios where you create and destroy many entities, use object pooling:

```typescript
import {
  LifetimeComponent,
  ReturnToPoolStrategyComponent,
  LifetimeTrackingSystem,
  ReturnToPoolLifecycleSystem,
  ObjectPool,
} from '@forge-game-engine/forge';

// Create a pool for bullet entities
const bulletPool = new ObjectPool(() => {
  return world.buildEntity('bullet', [
    new SpriteComponent(bulletSprite),
    new PositionComponent(0, 0),
    // ... other components
  ]);
});

// Add systems to your world
world.addSystems(
  new LifetimeTrackingSystem(world),
  new ReturnToPoolLifecycleSystem(world),
);

// Spawn a bullet from the pool
function fireBullet(x: number, y: number) {
  const bullet = bulletPool.acquire();

  // Reset bullet state
  bullet.getComponent<PositionComponent>(PositionComponent.symbol)!.x = x;
  bullet.getComponent<PositionComponent>(PositionComponent.symbol)!.y = y;

  // Add lifetime and pool strategy
  bullet.addComponent(new LifetimeComponent(5.0)); // 5 second lifetime
  bullet.addComponent(new ReturnToPoolStrategyComponent(bulletPool));

  world.addEntity(bullet);
}
```

### Timed Power-ups

Create power-ups that expire after a duration:

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

### Delayed Actions

Execute actions after a delay:

```typescript
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge';

// Create an entity that triggers an action when its lifetime expires
class DelayedActionComponent implements Component {
  name = Symbol('DelayedAction');
  action: () => void;

  constructor(action: () => void) {
    this.action = action;
  }
}

// System to execute delayed actions
class DelayedActionSystem extends System {
  constructor() {
    super('DelayedAction', [
      LifetimeComponent.symbol,
      DelayedActionComponent.symbol,
    ]);
  }

  run(entity: Entity): void {
    const lifetime = entity.getComponentRequired<LifetimeComponent>(
      LifetimeComponent.symbol,
    );
    const delayed = entity.getComponentRequired<DelayedActionComponent>(
      DelayedActionComponent.symbol,
    );

    if (lifetime.hasExpired) {
      delayed.action();
    }
  }
}

// Use it
world.buildAndAddEntity('delayed-spawn', [
  new LifetimeComponent(5.0), // Wait 5 seconds
  new RemoveFromWorldStrategyComponent(),
  new DelayedActionComponent(() => {
    spawnEnemy();
  }),
]);
```

## Design Principles

The lifecycle module follows these principles:

1. **Composability**: Components can be mixed and matched to create different behaviors
2. **Data-Only Components**: All components contain only data, no logic or methods
3. **Single Responsibility Systems**: Each system handles one specific strategy without conditionals
4. **Type Safety**: Strong typing throughout, avoiding the `any` type
5. **Separation of Concerns**: Lifetime tracking is separate from disposal strategies

## Integration with Other Systems

The lifecycle module works seamlessly with other Forge systems:

- **Particles**: Automatically expires particles after their lifetime
- **Animations**: Can be combined with animation systems for timed effects
- **Physics**: Expired entities are properly removed from physics simulations
- **Rendering**: Expired entities are removed from render queues

## Best Practices

1. **Always add a strategy component**: Entities with `LifetimeComponent` should also have a strategy component (`RemoveFromWorldStrategyComponent` or `ReturnToPoolStrategyComponent`)

2. **Add systems in the correct order**: Add `LifetimeTrackingSystem` before the handler systems:

   ```typescript
   world.addSystems(
     new LifetimeTrackingSystem(world), // First: track lifetime
     new RemoveFromWorldLifecycleSystem(world), // Then: handle expired entities
   );
   ```

3. **Use pooling for frequently created/destroyed entities**: For bullets, particles, or other high-frequency entities, use `ReturnToPoolStrategyComponent` for better performance

4. **Keep components composable**: Don't create monolithic components; use the lifecycle components alongside other small, focused components

5. **Avoid manual expiration checks**: Let the `LifetimeTrackingSystem` handle setting the `hasExpired` flag rather than checking `elapsedSeconds >= durationSeconds` manually
