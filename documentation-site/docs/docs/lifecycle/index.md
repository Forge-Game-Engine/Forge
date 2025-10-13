# Entity Lifetime Management

Forge provides components and systems for managing entity lifetimes in your game. You can automatically remove entities after a certain duration or return them to an object pool for reuse.

## Quick Start

To use lifetime management, you need to:

1. Add the tracking system to your world
2. Add a disposal system (removal or pooling)
3. Add components to entities that should expire

```typescript
import {
  LifetimeTrackingSystem,
  RemoveFromWorldLifecycleSystem,
} from '@forge-game-engine/forge';

// Add systems to your world
world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
);
```

## Learn More

- [Example Use Cases](./examples.md) - Common patterns for using lifetime management
- [Components Reference](./components.md) - Detailed component documentation
- [Systems Reference](./systems.md) - Detailed system documentation
