---
sidebar_position: 1
---

# Physics

Forge integrates [Matter.js](https://brm.io/matter-js/) for 2D physics simulation.

## Components and Systems

- [`PhysicsBodyComponent`](../../api/classes/PhysicsBodyComponent.md) - Wraps a Matter.js body
- [`PhysicsSystem`](../../api/classes/PhysicsSystem.md) - Updates physics simulation

## Setup

```ts
import { Bodies, Engine, World } from 'matter-js';
import { PhysicsSystem, PhysicsBodyComponent } from '@forge-game-engine/forge';

// Create Matter.js engine
const physicsEngine = Engine.create({
  gravity: { x: 0, y: 1 }
});

// Add physics system
world.addSystem(new PhysicsSystem(physicsEngine));

// Create a physics body
const body = Bodies.rectangle(100, 100, 50, 50);
World.add(physicsEngine.world, body);

// Add to entity
entity.addComponent(new PhysicsBodyComponent(body));
```

## Body Types

```ts
// Static (doesn't move)
const platform = Bodies.rectangle(x, y, width, height, {
  isStatic: true
});

// Dynamic (affected by forces)
const player = Bodies.circle(x, y, radius);

// Sensor (detects collisions but doesn't affect movement)
const trigger = Bodies.rectangle(x, y, width, height, {
  isSensor: true
});
```

## Applying Forces

```ts
import { Body } from 'matter-js';

const physicsComp = entity.getComponent(PhysicsBodyComponent);
const body = physicsComp.physicsBody;

// Apply force
Body.applyForce(body, body.position, { x: 0.01, y: 0 });

// Set velocity directly
Body.setVelocity(body, { x: 10, y: 0 });
```

## Collision Events

```ts
import { Events } from 'matter-js';

Events.on(physicsEngine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;
    // Handle collision
  });
});
```

## Syncing with ECS

Use a system to sync physics to rendering:

```ts
class PhysicsSyncSystem extends System {
  constructor() {
    super('physics-sync', [
      PhysicsBodyComponent.symbol,
      PositionComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const physicsComp = entity.getComponent(PhysicsBodyComponent);
    const position = entity.getComponent(PositionComponent);
    
    position.x = physicsComp.physicsBody.position.x;
    position.y = physicsComp.physicsBody.position.y;
  }
}
```

## See Also

- [PhysicsBodyComponent API](../../api/classes/PhysicsBodyComponent.md)
- [PhysicsSystem API](../../api/classes/PhysicsSystem.md)
- [Matter.js Documentation](https://brm.io/matter-js/docs/)
