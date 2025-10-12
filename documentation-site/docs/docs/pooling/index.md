---
sidebar_position: 1
---

# Pooling

Object pooling is a performance optimization technique that reuses objects instead of creating and destroying them repeatedly. Forge provides an `ObjectPool` class to manage pools of reusable objects.

## Why Use Object Pooling?

Object pooling is beneficial when:

- You frequently create and destroy objects (particles, bullets, enemies)
- Object creation is expensive
- Garbage collection causes performance issues
- You need predictable memory usage

## Basic Usage

### Creating a Pool

```ts
import { ObjectPool } from '@forge-game-engine/forge';

// Create a pool of numbers
const numberPool = new ObjectPool<number>(
  [],                          // Starting pool (empty)
  () => Math.random(),        // Create callback
  (num) => console.log('Disposing', num)  // Dispose callback
);
```

### Using Pool Objects

```ts
// Get or create an object
const obj = pool.getOrCreate();

// Use the object
console.log(obj);

// Release it back to the pool
pool.release(obj);

// Get from pool (throws if empty)
const reusedObj = pool.get();
```

## Entity Pooling

The most common use case is pooling entities:

### Basic Entity Pool

```ts
import { ObjectPool, Entity, World } from '@forge-game-engine/forge';

class BulletPool {
  private pool: ObjectPool<Entity>;
  
  constructor(private world: World) {
    this.pool = new ObjectPool<Entity>(
      [],
      () => this.createBullet(),
      (bullet) => this.disposeBullet(bullet)
    );
  }
  
  private createBullet(): Entity {
    return this.world.buildAndAddEntity('bullet', [
      new PositionComponent(0, 0),
      new VelocityComponent(0, 0),
      new SpriteComponent(bulletSprite),
      new BulletComponent()
    ]);
  }
  
  private disposeBullet(bullet: Entity) {
    // Reset bullet state
    const position = bullet.getComponent(PositionComponent);
    position.x = 0;
    position.y = 0;
    
    const velocity = bullet.getComponent(VelocityComponent);
    velocity.x = 0;
    velocity.y = 0;
    
    // Hide bullet (or remove from world temporarily)
    const sprite = bullet.getComponent(SpriteComponent);
    sprite.isVisible = false;
  }
  
  spawn(x: number, y: number, velocityX: number, velocityY: number): Entity {
    const bullet = this.pool.getOrCreate();
    
    // Set position
    const position = bullet.getComponent(PositionComponent);
    position.x = x;
    position.y = y;
    
    // Set velocity
    const velocity = bullet.getComponent(VelocityComponent);
    velocity.x = velocityX;
    velocity.y = velocityY;
    
    // Show bullet
    const sprite = bullet.getComponent(SpriteComponent);
    sprite.isVisible = true;
    
    return bullet;
  }
  
  despawn(bullet: Entity) {
    this.pool.release(bullet);
  }
}

// Usage
const bulletPool = new BulletPool(world);

// Spawn bullets
const bullet1 = bulletPool.spawn(100, 100, 10, 0);
const bullet2 = bulletPool.spawn(150, 150, -10, 0);

// Later, despawn them
bulletPool.despawn(bullet1);
bulletPool.despawn(bullet2);
```

## Pre-warming Pools

Create objects upfront to avoid creation during gameplay:

```ts
class ParticlePool {
  private pool: ObjectPool<Particle>;
  
  constructor(initialSize: number) {
    // Pre-create particles
    const initialPool: Particle[] = [];
    for (let i = 0; i < initialSize; i++) {
      initialPool.push(this.createParticle());
    }
    
    this.pool = new ObjectPool<Particle>(
      initialPool,
      () => this.createParticle(),
      (particle) => this.resetParticle(particle)
    );
  }
  
  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      life: 0,
      maxLife: 1
    };
  }
  
  private resetParticle(particle: Particle) {
    particle.x = 0;
    particle.y = 0;
    particle.velocityX = 0;
    particle.velocityY = 0;
    particle.life = 0;
  }
  
  get(): Particle {
    return this.pool.getOrCreate();
  }
  
  release(particle: Particle) {
    this.pool.release(particle);
  }
}

// Pre-warm with 100 particles
const particlePool = new ParticlePool(100);
```

## Pooling Strategies

### Auto-Return Pool

Automatically return objects after a delay:

```ts
class TimedBulletPool {
  private pool: ObjectPool<Entity>;
  private activeTimers = new Map<Entity, number>();
  
  spawn(x: number, y: number, lifetime: number): Entity {
    const bullet = this.pool.getOrCreate();
    
    // Set up bullet...
    
    // Auto-despawn after lifetime
    const timerId = setTimeout(() => {
      this.despawn(bullet);
    }, lifetime * 1000);
    
    this.activeTimers.set(bullet, timerId);
    
    return bullet;
  }
  
  despawn(bullet: Entity) {
    // Clear timer
    const timerId = this.activeTimers.get(bullet);
    if (timerId) {
      clearTimeout(timerId);
      this.activeTimers.delete(bullet);
    }
    
    this.pool.release(bullet);
  }
}
```

### Conditional Pooling

Pool based on object state:

```ts
class EnemyPool {
  spawn(type: string, x: number, y: number): Entity {
    const enemy = this.pool.getOrCreate();
    const enemyComp = enemy.getComponent(EnemyComponent);
    
    enemyComp.type = type;
    enemyComp.health = 100;
    enemyComp.isActive = true;
    
    const position = enemy.getComponent(PositionComponent);
    position.x = x;
    position.y = y;
    
    return enemy;
  }
  
  checkAndDespawn(enemy: Entity) {
    const enemyComp = enemy.getComponent(EnemyComponent);
    
    // Return to pool if dead
    if (enemyComp.health <= 0) {
      enemyComp.isActive = false;
      this.pool.release(enemy);
      return true;
    }
    
    return false;
  }
}
```

## Complete Example

```ts
import {
  Game,
  createWorld,
  ObjectPool,
  Entity,
  System,
  PositionComponent,
  SpriteComponent
} from '@forge-game-engine/forge';

interface Bullet {
  entity: Entity;
  lifetime: number;
}

class BulletPoolManager {
  private pool: ObjectPool<Bullet>;
  private activeBullets: Set<Bullet> = new Set();
  
  constructor(private world: World, private sprite: Sprite) {
    this.pool = new ObjectPool<Bullet>(
      [],
      () => this.createBullet(),
      (bullet) => this.resetBullet(bullet)
    );
  }
  
  private createBullet(): Bullet {
    const entity = this.world.buildAndAddEntity('bullet', [
      new PositionComponent(0, 0),
      new SpriteComponent(this.sprite)
    ]);
    
    return {
      entity,
      lifetime: 0
    };
  }
  
  private resetBullet(bullet: Bullet) {
    bullet.lifetime = 0;
    const sprite = bullet.entity.getComponent(SpriteComponent);
    sprite.isVisible = false;
  }
  
  spawn(x: number, y: number): void {
    const bullet = this.pool.getOrCreate();
    
    const position = bullet.entity.getComponent(PositionComponent);
    position.x = x;
    position.y = y;
    
    const sprite = bullet.entity.getComponent(SpriteComponent);
    sprite.isVisible = true;
    
    bullet.lifetime = 0;
    this.activeBullets.add(bullet);
  }
  
  update(deltaTime: number): void {
    const bulletsToRemove: Bullet[] = [];
    
    for (const bullet of this.activeBullets) {
      bullet.lifetime += deltaTime;
      
      // Despawn after 3 seconds
      if (bullet.lifetime > 3) {
        bulletsToRemove.push(bullet);
      }
    }
    
    // Return to pool
    for (const bullet of bulletsToRemove) {
      this.activeBullets.delete(bullet);
      this.pool.release(bullet);
    }
  }
}

// Usage in system
class BulletSpawnSystem extends System {
  constructor(private bulletPool: BulletPoolManager) {
    super('bullet-spawn', []);
  }
  
  beforeAll() {
    if (shootAction.isTriggered) {
      // Spawn 5 bullets
      for (let i = 0; i < 5; i++) {
        this.bulletPool.spawn(
          100 + i * 20,
          100
        );
      }
    }
    
    // Update bullet lifetimes
    this.bulletPool.update(this.time.deltaTimeInSeconds);
  }
}
```

## Best Practices

- **Pre-warm pools** - Create objects during loading, not gameplay
- **Reset object state** - Ensure objects are clean when released
- **Use dispose callback** - Clean up resources in the dispose callback
- **Pool frequently created objects** - Bullets, particles, enemies
- **Don't over-pool** - Not everything needs pooling
- **Monitor pool size** - Ensure pools don't grow unbounded
- **Use type safety** - TypeScript generics help catch errors
- **Clear pools on level change** - Reset pools between levels

## Performance Tips

- **Avoid allocation in hot paths** - Use pools in frequently called code
- **Batch operations** - Spawn/despawn multiple objects at once
- **Limit pool growth** - Set maximum pool sizes if needed
- **Profile first** - Only pool if profiling shows benefit
- **Consider memory** - Large pools increase memory usage

## Common Patterns

### Pool Manager Registry

```ts
class PoolRegistry {
  private pools = new Map<string, ObjectPool<any>>();
  
  register<T>(name: string, pool: ObjectPool<T>) {
    this.pools.set(name, pool);
  }
  
  get<T>(name: string): ObjectPool<T> {
    return this.pools.get(name)!;
  }
}

// Usage
const registry = new PoolRegistry();
registry.register('bullets', bulletPool);
registry.register('enemies', enemyPool);

const bullets = registry.get<Entity>('bullets');
```

### Lazy Pool Initialization

```ts
class LazyPool<T> {
  private pool: ObjectPool<T> | null = null;
  
  constructor(
    private createFn: () => T,
    private disposeFn: (obj: T) => void
  ) {}
  
  private ensurePool() {
    if (!this.pool) {
      this.pool = new ObjectPool<T>([], this.createFn, this.disposeFn);
    }
  }
  
  get(): T {
    this.ensurePool();
    return this.pool!.getOrCreate();
  }
  
  release(obj: T) {
    this.ensurePool();
    this.pool!.release(obj);
  }
}
```

## See Also

- [ObjectPool API](../../api/classes/ObjectPool.md)
- [ECS Documentation](../ecs/index.md)
