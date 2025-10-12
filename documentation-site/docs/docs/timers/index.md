---
sidebar_position: 1
---

# Timers

Forge provides a timer system for scheduling delayed or repeated actions in your game. Timers are managed through the `TimerComponent` and `TimerSystem`.

## Overview

The timer system allows you to:

- **Schedule one-time actions** - Execute code after a delay
- **Create repeating timers** - Run code at regular intervals
- **Limit repetitions** - Control how many times a timer repeats
- **Manage multiple timers** - Add multiple tasks to a single entity

## Basic Usage

### One-Time Timer

Execute code once after a delay:

```ts
import { TimerComponent, TimerSystem } from '@forge-game-engine/forge';

// Create timer entity
const timerEntity = world.buildAndAddEntity('timer', [
  new TimerComponent([
    {
      callback: () => {
        console.log('Timer fired after 2 seconds!');
      },
      delay: 2000  // milliseconds
    }
  ])
]);

// Add timer system to world
world.addSystem(new TimerSystem(world.time));
```

### Repeating Timer

Execute code repeatedly at an interval:

```ts
const timerComp = new TimerComponent([
  {
    callback: () => {
      console.log('This runs every second');
    },
    delay: 0,        // Initial delay before first run
    repeat: true,    // Make it repeat
    interval: 1000   // Interval between repeats (ms)
  }
]);
```

### Limited Repetitions

Repeat a timer a specific number of times:

```ts
const timerComp = new TimerComponent([
  {
    callback: () => {
      console.log('This runs 5 times');
    },
    delay: 0,
    repeat: true,
    interval: 1000,
    maxRuns: 5       // Stop after 5 executions
  }
]);
```

## Adding Timers Dynamically

Add timers to existing entities:

```ts
const timerComp = entity.getComponent(TimerComponent);

timerComp.addTask({
  callback: () => {
    console.log('Dynamically added timer');
  },
  delay: 3000
});
```

## Timer Tasks

### Timer Task Properties

```ts
interface TimerTask {
  callback: () => void;   // Function to execute
  delay: number;          // Initial delay in ms
  elapsed?: number;       // Elapsed time (managed by system)
  repeat?: boolean;       // Whether to repeat
  interval?: number;      // Time between repeats (if repeat = true)
  maxRuns?: number;       // Max executions (if repeat = true)
  runsSoFar?: number;     // Current execution count (managed by system)
}
```

## Practical Examples

### Delayed Spawn

Spawn an enemy after a delay:

```ts
function spawnEnemyAfterDelay(world: World, delay: number) {
  const timerEntity = world.buildAndAddEntity('spawn-timer', [
    new TimerComponent([
      {
        callback: () => {
          // Spawn enemy
          const enemy = world.buildAndAddEntity('enemy', [
            new PositionComponent(400, 100),
            new EnemyComponent()
          ]);
          
          // Remove timer entity
          world.removeEntity(timerEntity);
        },
        delay: delay
      }
    ])
  ]);
}

// Spawn enemy after 5 seconds
spawnEnemyAfterDelay(world, 5000);
```

### Wave Spawner

Spawn enemies in waves:

```ts
class WaveSpawner {
  constructor(private world: World) {}
  
  startWaves() {
    const timerEntity = this.world.buildAndAddEntity('wave-spawner', [
      new TimerComponent([
        {
          callback: () => {
            this.spawnWave();
          },
          delay: 5000,      // First wave after 5 seconds
          repeat: true,
          interval: 10000,  // Subsequent waves every 10 seconds
          maxRuns: 5        // 5 waves total
        }
      ])
    ]);
  }
  
  private spawnWave() {
    // Spawn 3 enemies
    for (let i = 0; i < 3; i++) {
      this.world.buildAndAddEntity('enemy', [
        new PositionComponent(100 + i * 100, 100),
        new EnemyComponent()
      ]);
    }
    
    console.log('Wave spawned!');
  }
}

// Usage
const spawner = new WaveSpawner(world);
spawner.startWaves();
```

### Cooldown Timer

Implement ability cooldowns with data in the component and logic in a system:

```ts
// Component stores only data
class AbilityComponent implements Component {
  name = Symbol('Ability');
  cooldownRemaining = 0;
  cooldownDuration = 3000;  // 3 second cooldown
}

// System contains the logic
class AbilitySystem extends System {
  constructor() {
    super('ability', [AbilityComponent.symbol]);
  }
  
  run(entity: Entity) {
    const ability = entity.getComponent(AbilityComponent);
    
    // Update cooldown
    if (ability.cooldownRemaining > 0) {
      ability.cooldownRemaining -= this.time.deltaTimeInMilliseconds;
      ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining);
    }
  }
  
  // System method to use ability
  useAbility(entity: Entity) {
    const ability = entity.getComponent(AbilityComponent);
    
    if (ability.cooldownRemaining <= 0) {
      // Execute ability logic
      console.log('Ability used!');
      ability.cooldownRemaining = ability.cooldownDuration;
    }
  }
}

// Alternative: Using timer component
function createAbilityWithTimer(world: World) {
  let canUseAbility = true;
  
  const entity = world.buildAndAddEntity('player', [
    new TimerComponent()
  ]);
  
  function useAbility() {
    if (!canUseAbility) return;
    
    console.log('Ability used!');
    canUseAbility = false;
    
    // Add cooldown timer
    const timer = entity.getComponent(TimerComponent);
    timer.addTask({
      callback: () => {
        canUseAbility = true;
        console.log('Ability ready!');
      },
      delay: 3000
    });
  }
  
  return useAbility;
}
```

### Temporary Power-up

Remove a power-up effect after a duration:

```ts
function applyPowerup(entity: Entity, duration: number) {
  // Add power-up component
  const powerup = new PowerupComponent();
  entity.addComponent(powerup);
  
  // Add timer to remove it
  const timerComp = entity.getComponent(TimerComponent) 
    || new TimerComponent();
  
  if (!entity.hasComponent(TimerComponent.symbol)) {
    entity.addComponent(timerComp);
  }
  
  timerComp.addTask({
    callback: () => {
      entity.removeComponent(PowerupComponent.symbol);
      console.log('Power-up expired');
    },
    delay: duration
  });
}

// Usage: 10 second power-up
applyPowerup(playerEntity, 10000);
```

### Countdown Timer

Create a countdown with UI updates:

```ts
class CountdownTimer {
  private timeRemaining: number;
  
  constructor(
    private world: World,
    private duration: number,
    private onTick: (timeRemaining: number) => void,
    private onComplete: () => void
  ) {
    this.timeRemaining = duration;
    this.start();
  }
  
  private start() {
    const timerEntity = this.world.buildAndAddEntity('countdown', [
      new TimerComponent([
        {
          callback: () => {
            this.timeRemaining -= 1000;
            this.onTick(this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
              this.onComplete();
              this.world.removeEntity(timerEntity);
            }
          },
          delay: 0,
          repeat: true,
          interval: 1000,
          maxRuns: Math.ceil(this.duration / 1000)
        }
      ])
    ]);
  }
}

// Usage
const countdown = new CountdownTimer(
  world,
  10000,  // 10 seconds
  (remaining) => {
    console.log(`Time remaining: ${remaining / 1000} seconds`);
    updateUITimer(remaining);
  },
  () => {
    console.log('Countdown complete!');
    endGame();
  }
);
```

### Flashing Effect

Make an entity flash by toggling visibility:

```ts
function makeEntityFlash(entity: Entity, duration: number, interval: number) {
  const sprite = entity.getComponent(SpriteComponent);
  const timerComp = entity.getComponent(TimerComponent) || new TimerComponent();
  
  if (!entity.hasComponent(TimerComponent.symbol)) {
    entity.addComponent(timerComp);
  }
  
  timerComp.addTask({
    callback: () => {
      sprite.enabled = !sprite.enabled;
    },
    delay: 0,
    repeat: true,
    interval: interval,
    maxRuns: Math.ceil(duration / interval)
  });
  
  // Ensure visible at end
  timerComp.addTask({
    callback: () => {
      sprite.enabled = true;
    },
    delay: duration
  });
}

// Flash entity for 2 seconds, toggling every 100ms
makeEntityFlash(entity, 2000, 100);
```

## Multiple Timers per Entity

An entity can have multiple timer tasks:

```ts
const timerComp = new TimerComponent([
  {
    callback: () => console.log('Timer 1'),
    delay: 1000
  },
  {
    callback: () => console.log('Timer 2'),
    delay: 2000
  },
  {
    callback: () => console.log('Timer 3'),
    delay: 3000,
    repeat: true,
    interval: 1000
  }
]);
```

## Complete Example

```ts
import {
  Game,
  createWorld,
  TimerComponent,
  TimerSystem,
  PositionComponent
} from '@forge-game-engine/forge';

const game = new Game();
const { world } = createWorld('main', game);

// Add timer system
world.addSystem(new TimerSystem(world.time));

// Create game timer entity
const gameTimer = world.buildAndAddEntity('game-timer', [
  new TimerComponent([
    // Spawn enemies every 2 seconds
    {
      callback: () => {
        world.buildAndAddEntity('enemy', [
          new PositionComponent(
            Math.random() * 800,
            0
          )
        ]);
      },
      delay: 2000,
      repeat: true,
      interval: 2000
    },
    // Game over after 60 seconds
    {
      callback: () => {
        console.log('Game Over!');
        game.stop();
      },
      delay: 60000
    }
  ])
]);

game.run();
```

## Best Practices

- **Clean up timer entities** - Remove entities when timers complete
- **Use one timer entity** - Consolidate multiple timers when possible
- **Consider alternatives** - For simple delays, systems with elapsed time work too
- **Avoid excessive timers** - Too many timer entities can impact performance
- **Use maxRuns** - Prevent infinite timers when you want a limit
- **Handle edge cases** - What if entity is removed before timer completes?

## See Also

- [TimerComponent API](../../api/classes/TimerComponent.md)
- [TimerSystem API](../../api/classes/TimerSystem.md)
- [Time Documentation](../common/time.md)
