---
sidebar_position: 3
---

# Systems

## TimerSystem

The `TimerSystem` processes all entities with a `TimerComponent`, updating elapsed time and executing callbacks when their delays are reached.

### Constructor

```typescript
new TimerSystem(time: Time)
```

**Parameters:**

- `time: Time` - The Time instance used to track delta time

### Behavior

The system runs once per frame for each entity with a `TimerComponent`:

1. Skips processing if the entity has no tasks
2. Gets the frame's delta time in milliseconds
3. Iterates through tasks in reverse order (for safe removal)
4. For each task:
   - Increments `elapsed` by delta time
   - If `elapsed >= delay`:
     - Executes the callback
     - For one-shot timers: removes the task
     - For repeating timers:
       - Increments `runsSoFar`
       - If `maxRuns` is reached: removes the task
       - Otherwise: resets `elapsed` to 0 and updates `delay` to `interval`

### Usage

Add the TimerSystem to your world after creating it:

```typescript
import { World } from '@forge-game-engine/forge/ecs';
import { TimerSystem } from '@forge-game-engine/forge/timer';

const world = new World('game');
const timerSystem = new TimerSystem(world.time);
world.addSystem(timerSystem);
```

### How It Works

#### One-shot Timers

```typescript
// Timer task with 1000ms delay
{
  callback: () => console.log('Done!'),
  delay: 1000,
  elapsed: 0,
}

// Frame 1: elapsed = 0 + 16 = 16ms (not fired)
// Frame 2: elapsed = 16 + 17 = 33ms (not fired)
// ...
// Frame 60: elapsed = 984 + 17 = 1001ms (FIRED! Task removed)
```

#### Repeating Timers

```typescript
// Timer task with 500ms initial delay and 250ms interval
{
  callback: () => console.log('Tick!'),
  delay: 500,
  elapsed: 0,
  repeat: true,
  interval: 250,
  runsSoFar: 0,
}

// Frames 1-29: elapsed accumulates to 500ms
// Frame 30: elapsed >= 500ms -> FIRST EXECUTION
//   - runsSoFar becomes 1
//   - elapsed resets to 0
//   - delay becomes 250 (now uses interval)
// Frames 31-44: elapsed accumulates to 250ms
// Frame 45: elapsed >= 250ms -> SECOND EXECUTION
//   - runsSoFar becomes 2
//   - elapsed resets to 0
// ... (continues indefinitely unless maxRuns is set)
```

#### Limited Repeating Timers

```typescript
{
  callback: () => console.log('Tick!'),
  delay: 1000,
  elapsed: 0,
  repeat: true,
  interval: 1000,
  maxRuns: 3,
  runsSoFar: 0,
}

// After 1000ms: First execution (runsSoFar = 1)
// After 2000ms: Second execution (runsSoFar = 2)
// After 3000ms: Third execution (runsSoFar = 3, task removed)
```

### Integration with ECS

The TimerSystem follows the standard ECS pattern:

```typescript
import { World, Entity } from '@forge-game-engine/forge/ecs';
import { TimerComponent, TimerSystem } from '@forge-game-engine/forge/timer';

// 1. Create world
const world = new World('game');

// 2. Add TimerSystem to world
const timerSystem = new TimerSystem(world.time);
world.addSystem(timerSystem);

// 3. Create entities with TimerComponent
const entity = new Entity(world, [new TimerComponent()]);
world.addEntity(entity);

// 4. Add timer tasks
const timerComponent = entity.getComponentRequired(TimerComponent);
timerComponent.addTask({
  callback: () => console.log('Hello from timer!'),
  delay: 1000,
  elapsed: 0,
});

// 5. Update world in game loop
function gameLoop(timestamp: number) {
  world.time.update(timestamp);
  world.update(); // TimerSystem runs here
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

### Performance Considerations

- Tasks are processed in **reverse order** (from end to start) to allow safe removal during iteration
- Completed tasks are immediately removed from the array
- Empty task lists cause early return (minimal overhead)
- Each task's callback is executed synchronously within the frame

### Common Patterns

#### Delayed Entity Spawning

```typescript
// Spawn enemy after 3 seconds
timerComponent.addTask({
  callback: () => {
    const enemy = world.buildAndAddEntity([
      new PositionComponent(100, 100),
      new EnemyComponent(),
    ]);
  },
  delay: 3000,
  elapsed: 0,
});
```

#### Cooldown System

```typescript
class AbilityComponent extends Component {
  private canUse = true;
  
  public use(entity: Entity): void {
    if (!this.canUse) return;
    
    // Use ability
    console.log('Ability used!');
    this.canUse = false;
    
    // Add cooldown timer
    const timerComponent = entity.getComponentRequired(TimerComponent);
    timerComponent.addTask({
      callback: () => {
        this.canUse = true;
        console.log('Ability ready!');
      },
      delay: 5000, // 5 second cooldown
      elapsed: 0,
    });
  }
}
```

#### Wave System

```typescript
// Spawn waves of enemies every 10 seconds
timerComponent.addTask({
  callback: () => {
    for (let i = 0; i < 5; i++) {
      spawnEnemy(world);
    }
  },
  delay: 10000,
  elapsed: 0,
  repeat: true,
  interval: 10000,
  runsSoFar: 0,
});
```

#### Temporary Power-up

```typescript
// Power-up that lasts 10 seconds
timerComponent.addTask({
  callback: () => {
    // Remove power-up effect
    const playerComponent = entity.getComponentRequired(PlayerComponent);
    playerComponent.speedMultiplier = 1.0;
    console.log('Power-up expired');
  },
  delay: 10000,
  elapsed: 0,
});
```
