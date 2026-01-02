---
sidebar_position: 1
---

# Timer

The Timer module provides a flexible system for scheduling and executing callbacks on entities at specific intervals. It's built on the Entity-Component-System (ECS) architecture and integrates seamlessly with the game loop.

## Overview

The timer system consists of two main parts:

1. **TimerComponent**: Holds a list of timer tasks for an entity
2. **TimerSystem**: Processes timer tasks each frame and executes callbacks when their time is up

## Key Features

- **One-shot timers**: Execute a callback once after a specified delay
- **Repeating timers**: Execute a callback repeatedly at specified intervals
- **Configurable limits**: Set a maximum number of runs for repeating timers
- **Frame-independent**: Uses delta time for accurate timing
- **Multiple tasks**: Each entity can have multiple concurrent timer tasks

## Quick Example

```typescript
import { World, Entity } from '@forge-game-engine/forge/ecs';
import { TimerComponent, TimerSystem } from '@forge-game-engine/forge/timer';

// Create world and add timer system
const world = new World('game');
const timerSystem = new TimerSystem(world.time);
world.addSystem(timerSystem);

// Create entity with timer component
const entity = world.buildAndAddEntity([new TimerComponent()]);
const timerComponent = entity.getComponentRequired(TimerComponent);

// Add a one-shot timer (executes once after 1 second)
timerComponent.addTask({
  callback: () => console.log('Timer fired!'),
  delay: 1000, // milliseconds
  elapsed: 0,
});

// Add a repeating timer (executes every 500ms)
timerComponent.addTask({
  callback: () => console.log('Tick!'),
  delay: 500,
  elapsed: 0,
  repeat: true,
  interval: 500,
  runsSoFar: 0,
});
```

## Use Cases

- Spawn enemies at intervals
- Create timed power-ups that expire
- Implement cooldown systems for abilities
- Trigger events after delays
- Create periodic animations or effects
- Build countdown timers
