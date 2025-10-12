---
sidebar_position: 1
---

# Physics

Forge integrates [Matter.js](https://brm.io/matter-js/) for 2D physics simulation, providing realistic physics behavior including collisions, gravity, friction, and more.

## Overview

The physics system provides:

- **Rigid body physics** - Realistic movement and collisions
- **Various body shapes** - Rectangles, circles, polygons
- **Collision detection** - Automatic collision handling
- **Physics constraints** - Springs, hinges, etc.
- **Raycasting** - Line-of-sight checks

## Basic Setup

### Creating a Physics World

```ts
import { Bodies, Engine, World } from 'matter-js';
import { PhysicsSystem } from '@forge-game-engine/forge';

// Create Matter.js engine
const physicsEngine = Engine.create({
  gravity: { x: 0, y: 1 } // Default gravity
});

// Add physics system to your world
world.addSystem(new PhysicsSystem(physicsEngine));
```

### Creating Physics Bodies

```ts
import { Bodies } from 'matter-js';
import {
  PhysicsBodyComponent,
  PositionComponent
} from '@forge-game-engine/forge';

// Create a rectangular physics body
const body = Bodies.rectangle(
  100,  // x position
  100,  // y position
  50,   // width
  50,   // height
  {
    // Options
    friction: 0.1,
    restitution: 0.5,  // Bounciness (0-1)
    density: 0.001
  }
);

// Add to entity
const entity = world.buildAndAddEntity('physics-box', [
  new PositionComponent(100, 100),
  new PhysicsBodyComponent(body)
]);

// Add body to physics world
World.add(physicsEngine.world, body);
```

## Body Shapes

### Rectangle

```ts
import { Bodies } from 'matter-js';

const rectangle = Bodies.rectangle(
  x, y,      // Position
  width, height,  // Size
  {
    isStatic: false,  // Dynamic body
    friction: 0.3,
    restitution: 0.5
  }
);
```

### Circle

```ts
const circle = Bodies.circle(
  x, y,      // Position
  radius,    // Radius
  {
    density: 0.002,
    friction: 0.1,
    restitution: 0.8  // Bouncy
  }
);
```

### Polygon

```ts
// Triangle
const triangle = Bodies.polygon(
  x, y,      // Position
  3,         // Number of sides
  radius,    // Radius
  options
);

// Hexagon
const hexagon = Bodies.polygon(x, y, 6, radius, options);
```

### Custom Shapes

```ts
// Define custom vertices
const vertices = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 50, y: 50 },
  { x: 25, y: 75 }
];

const customBody = Bodies.fromVertices(
  x, y,
  vertices,
  options
);
```

## Body Properties

### Static vs Dynamic

```ts
// Static body (doesn't move, e.g., walls, platforms)
const platform = Bodies.rectangle(x, y, width, height, {
  isStatic: true
});

// Dynamic body (affected by forces)
const player = Bodies.circle(x, y, radius, {
  isStatic: false
});

// Sensor (detects collisions but doesn't affect movement)
const trigger = Bodies.rectangle(x, y, width, height, {
  isSensor: true
});
```

### Physical Properties

```ts
const body = Bodies.rectangle(x, y, width, height, {
  // Mass and density
  density: 0.001,      // kg/unit²
  mass: 10,            // Total mass (overrides density)
  
  // Surface properties
  friction: 0.3,       // 0 = frictionless, 1 = high friction
  frictionAir: 0.01,   // Air resistance
  frictionStatic: 0.5, // Static friction
  restitution: 0.5,    // Bounciness (0 = no bounce, 1 = perfect bounce)
  
  // Movement constraints
  inertia: Infinity,   // Rotational inertia (Infinity = no rotation)
});
```

## Applying Forces

### Force

Apply a force at a specific point:

```ts
import { Body, Vector } from 'matter-js';

const physicsComp = entity.getComponent(PhysicsBodyComponent);
const body = physicsComp.physicsBody;

// Apply force at body's center
Body.applyForce(
  body,
  body.position,
  { x: 0.01, y: 0 }  // Force vector
);

// Apply force at specific point
Body.applyForce(
  body,
  { x: body.position.x + 10, y: body.position.y },
  { x: 0, y: -0.02 }
);
```

### Velocity

Directly set velocity:

```ts
import { Body } from 'matter-js';

// Set velocity
Body.setVelocity(body, { x: 10, y: 0 });

// Set angular velocity (rotation speed)
Body.setAngularVelocity(body, 0.1);
```

### Impulse

Apply an instant force:

```ts
// Jump impulse
Body.applyForce(
  body,
  body.position,
  { x: 0, y: -0.1 }
);
```

## Collision Handling

### Collision Events

```ts
import { Events } from 'matter-js';

// Listen for collisions
Events.on(physicsEngine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;
    
    console.log('Collision between', bodyA.label, 'and', bodyB.label);
    
    // Handle collision
    handleCollision(bodyA, bodyB);
  });
});

// Collision active (while touching)
Events.on(physicsEngine, 'collisionActive', (event) => {
  // Called every frame while bodies are touching
});

// Collision end (stopped touching)
Events.on(physicsEngine, 'collisionEnd', (event) => {
  // Called when bodies separate
});
```

### Collision Filtering

Control which bodies collide:

```ts
// Define collision categories (use powers of 2)
const CATEGORY_PLAYER = 0x0001;
const CATEGORY_ENEMY = 0x0002;
const CATEGORY_WALL = 0x0004;
const CATEGORY_BULLET = 0x0008;

// Player collides with enemies and walls
const player = Bodies.circle(x, y, radius, {
  collisionFilter: {
    category: CATEGORY_PLAYER,
    mask: CATEGORY_ENEMY | CATEGORY_WALL  // Collides with these
  }
});

// Bullet collides with enemies and walls, not player
const bullet = Bodies.circle(x, y, radius, {
  collisionFilter: {
    category: CATEGORY_BULLET,
    mask: CATEGORY_ENEMY | CATEGORY_WALL  // Not CATEGORY_PLAYER
  }
});
```

## Raycasting

Check line-of-sight or shooting:

```ts
import { raycast } from '@forge-game-engine/forge';
import { Vector2 } from '@forge-game-engine/forge';

const start = new Vector2(100, 100);
const end = new Vector2(200, 200);

const hits = raycast(
  physicsEngine.world,
  start,
  end
);

if (hits.length > 0) {
  const hit = hits[0];
  console.log('Hit body:', hit.body.label);
  console.log('Hit point:', hit.point);
  console.log('Distance:', hit.distance);
}
```

## Constraints

### Distance Constraint

Keep bodies at a fixed distance:

```ts
import { Constraint, World } from 'matter-js';

const constraint = Constraint.create({
  bodyA: bodyA,
  bodyB: bodyB,
  length: 100,        // Distance to maintain
  stiffness: 0.5      // 0 = soft, 1 = rigid
});

World.add(physicsEngine.world, constraint);
```

### Spring

Create spring-like connections:

```ts
const spring = Constraint.create({
  bodyA: bodyA,
  bodyB: bodyB,
  stiffness: 0.01,    // Spring stiffness
  damping: 0.1        // Damping factor
});
```

### Hinge/Pivot

Rotate around a point:

```ts
const hinge = Constraint.create({
  bodyA: bodyA,
  bodyB: bodyB,
  pointA: { x: 0, y: 0 },    // Point on bodyA
  pointB: { x: 0, y: 0 },    // Point on bodyB
  stiffness: 1
});
```

## Practical Examples

### Player Movement

```ts
import { Body } from 'matter-js';

class PlayerPhysicsSystem extends System {
  constructor(
    private moveAction: Axis2dAction
  ) {
    super('player-physics', [
      PhysicsBodyComponent.symbol,
      PlayerComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const physicsComp = entity.getComponent(PhysicsBodyComponent);
    const body = physicsComp.physicsBody;
    
    const movement = this.moveAction.value;
    const speed = 0.01;
    
    // Apply horizontal force
    Body.applyForce(
      body,
      body.position,
      { x: movement.x * speed, y: 0 }
    );
    
    // Limit max speed
    if (Math.abs(body.velocity.x) > 10) {
      Body.setVelocity(body, {
        x: Math.sign(body.velocity.x) * 10,
        y: body.velocity.y
      });
    }
  }
}
```

### Jump

```ts
class JumpSystem extends System {
  private isGrounded = false;
  
  run(entity: Entity) {
    const physicsComp = entity.getComponent(PhysicsBodyComponent);
    const body = physicsComp.physicsBody;
    
    // Check if grounded (simple velocity check)
    this.isGrounded = Math.abs(body.velocity.y) < 0.1;
    
    // Jump when action triggered and grounded
    if (jumpAction.isTriggered && this.isGrounded) {
      Body.applyForce(
        body,
        body.position,
        { x: 0, y: -0.1 }  // Upward impulse
      );
    }
  }
}
```

### Sync Physics to Rendering

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
    const rotation = entity.getComponent(RotationComponent);
    
    // Sync physics position to render position
    position.x = physicsComp.physicsBody.position.x;
    position.y = physicsComp.physicsBody.position.y;
    
    if (rotation) {
      rotation.radians = physicsComp.physicsBody.angle;
    }
  }
}
```

## Complete Example

```ts
import {
  Game,
  createWorld,
  PhysicsSystem,
  PhysicsBodyComponent,
  PositionComponent,
  Vector2
} from '@forge-game-engine/forge';
import { Bodies, Engine, World } from 'matter-js';

const game = new Game();
const { world } = createWorld('main', game);

// Create physics engine
const physicsEngine = Engine.create({
  gravity: { x: 0, y: 1 }
});

// Create ground
const ground = Bodies.rectangle(400, 500, 800, 50, {
  isStatic: true
});
World.add(physicsEngine.world, ground);

// Create falling box
const box = Bodies.rectangle(400, 100, 50, 50, {
  restitution: 0.5
});
World.add(physicsEngine.world, box);

world.buildAndAddEntity('ground', [
  new PositionComponent(400, 500),
  new PhysicsBodyComponent(ground)
]);

world.buildAndAddEntity('box', [
  new PositionComponent(400, 100),
  new PhysicsBodyComponent(box)
]);

// Add physics system
world.addSystem(new PhysicsSystem(physicsEngine));

game.run();
```

## Best Practices

- **Use appropriate body types** - Static for immovable objects
- **Set collision filters** - Optimize performance and game logic
- **Apply forces carefully** - Too much force can break physics
- **Sync render and physics** - Keep visual and physics positions in sync
- **Clean up bodies** - Remove from Matter.js world when removing entities
- **Use raycasting** - For line-of-sight and projectiles
- **Tune physics properties** - Adjust friction, restitution for desired feel
- **Consider performance** - Limit number of dynamic bodies

## See Also

- [PhysicsBodyComponent API](../../api/classes/PhysicsBodyComponent.md)
- [PhysicsSystem API](../../api/classes/PhysicsSystem.md)
- [Matter.js Documentation](https://brm.io/matter-js/docs/)
