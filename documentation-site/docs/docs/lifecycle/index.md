# Entity Lifetime Management

Forge provides a component and systems for expiring entities after a set
duration. Give an entity a `LifetimeEcsComponent`, tag it with a disposal
strategy, and register the two systems below to track and act on expiration.

## Quick Start

To use lifetime management, you need to:

1. Add `createLifetimeTrackingEcsSystem` to your world to track elapsed time.
2. Add a disposal system, such as `createRemoveFromWorldEcsSystem`, to act on
   expired entities.
3. Give entities that should expire a `LifetimeEcsComponent` and the
   matching disposal tag.

```ts
import {
  addLifetimeComponent,
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';

const entity = world.createEntity();

addLifetimeComponent(world, entity, { durationSeconds: 3 }); // expires in 3 seconds
world.addTag(entity, RemoveFromWorldLifetimeStrategyId); // remove it from the world once it expires

// Add systems to your world
world.addSystem(createLifetimeTrackingEcsSystem(time));
world.addSystem(createRemoveFromWorldEcsSystem());
```
