---
sidebar_position: 1
---

# Particles

Forge provides a powerful particle system for creating visual effects like explosions, smoke, fire, sparkles, and more. The particle system is highly customizable and performant.

## Overview

The particle system consists of:

- **ParticleEmitter** - Emits and manages a pool of particles
- **ParticleEmitterComponent** - ECS component holding one or more emitters
- **ParticleEmitterSystem** - Updates all particle emitters
- **Particle** - Individual particle with properties

## Basic Setup

### Creating a Particle Emitter

```ts
import {
  ParticleEmitter,
  ParticleEmitterComponent,
  ParticleEmitterSystem,
  Vector2
} from '@forge-game-engine/forge';

// Create emitter configuration
const emitter = new ParticleEmitter({
  maxParticles: 100,
  emissionRate: 10, // particles per second
  particleLifetime: 2, // seconds
  
  // Particle appearance
  startColor: { r: 255, g: 100, b: 0, a: 1 },
  endColor: { r: 255, g: 0, b: 0, a: 0 },
  startSize: 10,
  endSize: 0,
  
  // Particle physics
  speed: 100,
  speedVariation: 20,
  angle: -Math.PI / 2, // Upward
  angleSpread: Math.PI / 4, // 45 degree cone
  
  // Optional gravity
  gravity: new Vector2(0, 200)
});

// Add to entity
const emitters = new Map([['fire', emitter]]);
const particleComponent = new ParticleEmitterComponent(emitters);
entity.addComponent(particleComponent);

// Add system to world
world.addSystem(new ParticleEmitterSystem(world.time, renderLayer));
```

## Particle Properties

### Lifetime and Emission

```ts
const emitter = new ParticleEmitter({
  maxParticles: 200,        // Maximum particles at once
  emissionRate: 50,         // Particles spawned per second
  particleLifetime: 1.5,    // How long particles live (seconds)
  burstCount: 0,            // Immediate burst of particles (0 = continuous)
  loop: true                // Whether to loop emission
});
```

### Visual Properties

```ts
const emitter = new ParticleEmitter({
  // Size
  startSize: 20,
  endSize: 5,
  sizeVariation: 3,
  
  // Color
  startColor: { r: 255, g: 255, b: 0, a: 1 },    // Yellow
  endColor: { r: 255, g: 0, b: 0, a: 0 },        // Transparent red
  
  // Rotation
  startRotation: 0,
  endRotation: Math.PI * 2,
  rotationVariation: Math.PI
});
```

### Movement Properties

```ts
const emitter = new ParticleEmitter({
  // Initial velocity
  speed: 100,
  speedVariation: 30,
  
  // Direction
  angle: 0,              // Radians, 0 = right
  angleSpread: Math.PI,  // Cone of emission
  
  // Forces
  gravity: new Vector2(0, 500),
  damping: 0.95          // Velocity multiplier per second (0-1)
});
```

## Particle Effects Examples

### Explosion

```ts
const explosionEmitter = new ParticleEmitter({
  maxParticles: 50,
  emissionRate: 0,
  burstCount: 50,        // One-time burst
  particleLifetime: 1,
  loop: false,
  
  startSize: 15,
  endSize: 0,
  startColor: { r: 255, g: 200, b: 0, a: 1 },
  endColor: { r: 255, g: 0, b: 0, a: 0 },
  
  speed: 200,
  speedVariation: 50,
  angle: 0,
  angleSpread: Math.PI * 2,  // 360 degrees
  
  damping: 0.9
});
```

### Fire

```ts
const fireEmitter = new ParticleEmitter({
  maxParticles: 100,
  emissionRate: 30,
  particleLifetime: 2,
  loop: true,
  
  startSize: 20,
  endSize: 5,
  sizeVariation: 5,
  
  startColor: { r: 255, g: 200, b: 0, a: 1 },
  endColor: { r: 255, g: 0, b: 0, a: 0 },
  
  speed: 50,
  speedVariation: 20,
  angle: -Math.PI / 2,       // Upward
  angleSpread: Math.PI / 6,  // 30 degree cone
  
  gravity: new Vector2(0, -100)  // Upward force
});
```

### Smoke

```ts
const smokeEmitter = new ParticleEmitter({
  maxParticles: 50,
  emissionRate: 10,
  particleLifetime: 3,
  
  startSize: 10,
  endSize: 30,
  sizeVariation: 5,
  
  startColor: { r: 100, g: 100, b: 100, a: 0.8 },
  endColor: { r: 150, g: 150, b: 150, a: 0 },
  
  speed: 20,
  speedVariation: 10,
  angle: -Math.PI / 2,
  angleSpread: Math.PI / 8,
  
  damping: 0.98
});
```

### Rain

```ts
const rainEmitter = new ParticleEmitter({
  maxParticles: 200,
  emissionRate: 100,
  particleLifetime: 2,
  
  startSize: 2,
  endSize: 2,
  startColor: { r: 100, g: 100, b: 255, a: 0.6 },
  endColor: { r: 100, g: 100, b: 255, a: 0.6 },
  
  speed: 400,
  speedVariation: 50,
  angle: Math.PI / 2,
  angleSpread: 0.1,
  
  gravity: new Vector2(0, 600)
});
```

### Sparkles

```ts
const sparkleEmitter = new ParticleEmitter({
  maxParticles: 50,
  emissionRate: 20,
  particleLifetime: 1,
  
  startSize: 5,
  endSize: 0,
  startColor: { r: 255, g: 255, b: 255, a: 1 },
  endColor: { r: 255, g: 255, b: 100, a: 0 },
  
  speed: 50,
  speedVariation: 30,
  angle: 0,
  angleSpread: Math.PI * 2,
  
  gravity: new Vector2(0, -50)
});
```

## Controlling Emitters

### Start and Stop

```ts
const particleComp = entity.getComponent(ParticleEmitterComponent);
const emitter = particleComp.emitters.get('explosion');

// Start emitting
emitter.start();

// Stop emitting (existing particles continue)
emitter.stop();

// Kill all particles immediately
emitter.clear();
```

### One-Shot Effects

For effects that should play once and clean up:

```ts
// Create explosion at position
function createExplosion(world: World, x: number, y: number) {
  const emitter = new ParticleEmitter({
    maxParticles: 50,
    burstCount: 50,
    loop: false,
    particleLifetime: 1,
    // ... other properties
  });
  
  const entity = world.buildAndAddEntity('explosion', [
    new PositionComponent(x, y),
    new ParticleEmitterComponent(new Map([['explosion', emitter]]))
  ]);
  
  // Remove entity after all particles die
  setTimeout(() => {
    world.removeEntity(entity);
  }, 1000);
}
```

## Multiple Emitters

An entity can have multiple emitters for complex effects:

```ts
// Fire with sparks
const fireEmitter = new ParticleEmitter({
  // Fire configuration
});

const sparkEmitter = new ParticleEmitter({
  // Spark configuration
});

const emitters = new Map([
  ['fire', fireEmitter],
  ['sparks', sparkEmitter]
]);

entity.addComponent(new ParticleEmitterComponent(emitters));

// Control individual emitters
const component = entity.getComponent(ParticleEmitterComponent);
component.emitters.get('fire').start();
component.emitters.get('sparks').start();
```

## Attaching to Entities

Particles follow the entity's position:

```ts
// Jet exhaust that follows a spaceship
const exhaustEmitter = new ParticleEmitter({
  maxParticles: 100,
  emissionRate: 50,
  particleLifetime: 0.5,
  speed: 200,
  angle: Math.PI, // Behind the ship
  angleSpread: Math.PI / 8
});

spaceship.addComponent(
  new ParticleEmitterComponent(new Map([['exhaust', exhaustEmitter]]))
);

// Particles will emit from spaceship's position as it moves
```

## Performance Tips

- **Limit max particles** - Keep `maxParticles` reasonable (100-200 per emitter)
- **Use object pooling** - The particle system internally pools particles
- **Minimize emitters** - Don't create too many emitters at once
- **Clean up one-shot effects** - Remove entities after burst effects complete
- **Adjust emission rate** - Lower `emissionRate` for less critical effects
- **Use appropriate lifetime** - Shorter lifetime = fewer active particles

## Complete Example

```ts
import {
  Game,
  createWorld,
  ParticleEmitter,
  ParticleEmitterComponent,
  ParticleEmitterSystem,
  PositionComponent,
  Vector2
} from '@forge-game-engine/forge';

const game = new Game();
const { world, renderLayers } = createWorld('main', game);

// Create a torch with fire particles
const fireEmitter = new ParticleEmitter({
  maxParticles: 100,
  emissionRate: 30,
  particleLifetime: 2,
  loop: true,
  
  startSize: 15,
  endSize: 5,
  sizeVariation: 3,
  
  startColor: { r: 255, g: 200, b: 0, a: 1 },
  endColor: { r: 255, g: 0, b: 0, a: 0 },
  
  speed: 50,
  speedVariation: 20,
  angle: -Math.PI / 2,
  angleSpread: Math.PI / 6,
  
  gravity: new Vector2(0, -100)
});

const torch = world.buildAndAddEntity('torch', [
  new PositionComponent(400, 300),
  new ParticleEmitterComponent(new Map([['fire', fireEmitter]]))
]);

// Add particle system
world.addSystem(new ParticleEmitterSystem(world.time, renderLayers[0]));

game.run();
```

## Best Practices

- **Start with reference effects** - Use the examples as templates
- **Tune visually** - Adjust properties while watching the effect
- **Consider color transitions** - Animate from bright to dark for fire/explosions
- **Use size variation** - Makes effects look more natural
- **Apply forces appropriately** - Gravity, wind, etc.
- **Clean up completed effects** - Remove one-shot emitter entities
- **Pool emitter entities** - Reuse for frequently spawned effects

## See Also

- [ParticleEmitter API](../../api/classes/ParticleEmitter.md)
- [ParticleEmitterComponent API](../../api/classes/ParticleEmitterComponent.md)
- [ParticleEmitterSystem API](../../api/classes/ParticleEmitterSystem.md)
