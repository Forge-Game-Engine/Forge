# Entity Lifetime Management

Forge provides components and systems for managing entity lifetimes in your game. You can automatically remove entities after a certain duration or return them to an object pool for reuse.

## Quick Start

To use lifetime management, you need to:

1. Add the tracking system to your world
2. Add a disposal system (removal or pooling)
3. Add components to entities that should expire

```typescript
import { Entity } from '@forge-game-engine/forge';
import {
  RemoveFromWorldStrategyComponent,
  LifetimeComponent
  LifetimeTrackingSystem,
  RemoveFromWorldLifecycleSystem,
} from '@forge-game-engine/forge/lifecycle';

const entity = world.buildAndAddEntity(
  'short-lived-entity', [
    new LifetimeComponent(3), // will expire in 3 seconds
    new RemoveFromWorldStrategyComponent() // when it expires, it will be removed from the world
  ]
);

// Add systems to your world
world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
);
```
