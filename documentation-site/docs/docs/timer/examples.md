---
sidebar_position: 4
---

# Examples

Complete examples demonstrating common timer use cases.

## Basic Timer Setup

```typescript
import { World } from '@forge-game-engine/forge/ecs';
import { TimerComponent, TimerSystem } from '@forge-game-engine/forge/timer';

// Setup
const world = new World('game');
const timerSystem = new TimerSystem(world.time);
world.addSystem(timerSystem);

// Create entity with timer
const entity = world.buildAndAddEntity([new TimerComponent()]);
const timerComponent = entity.getComponentRequired(TimerComponent);

// Start game loop
function gameLoop(timestamp: number) {
  world.time.update(timestamp);
  world.update();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

## Countdown Timer

```typescript
class CountdownComponent extends Component {
  public secondsRemaining: number;

  constructor(seconds: number) {
    super();
    this.secondsRemaining = seconds;
  }
}

// Create countdown entity
const countdownEntity = world.buildAndAddEntity([
  new CountdownComponent(10),
  new TimerComponent(),
]);

const countdown = countdownEntity.getComponentRequired(CountdownComponent);
const timerComp = countdownEntity.getComponentRequired(TimerComponent);

// Update countdown every second
timerComp.addTask({
  callback: () => {
    countdown.secondsRemaining--;
    console.log(`Time remaining: ${countdown.secondsRemaining}`);

    if (countdown.secondsRemaining <= 0) {
      console.log('Time is up!');
    }
  },
  delay: 1000,
  elapsed: 0,
  repeat: true,
  interval: 1000,
  maxRuns: 10, // Run 10 times (10 seconds)
  runsSoFar: 0,
});
```

## Enemy Spawn System

```typescript
import { PositionComponent } from '@forge-game-engine/forge/common';

// Example custom components (you would define these in your game)
class EnemyComponent extends Component {}
class SpriteComponent extends Component {
  constructor(public imagePath: string) {
    super();
  }
}

class EnemySpawnerComponent extends Component {
  public enemiesSpawned = 0;
  public maxEnemies = 20;
}

// Create spawner entity
const spawner = world.buildAndAddEntity([
  new EnemySpawnerComponent(),
  new TimerComponent(),
]);

const spawnerComp = spawner.getComponentRequired(EnemySpawnerComponent);
const spawnerTimer = spawner.getComponentRequired(TimerComponent);

// Spawn enemy every 2 seconds
spawnerTimer.addTask({
  callback: () => {
    // Create new enemy at random position
    const enemy = world.buildAndAddEntity([
      new PositionComponent(Math.random() * 800, Math.random() * 600),
      new EnemyComponent(),
      new SpriteComponent('enemy.png'),
    ]);

    spawnerComp.enemiesSpawned++;
    console.log(`Spawned enemy ${spawnerComp.enemiesSpawned}`);
  },
  delay: 2000,
  elapsed: 0,
  repeat: true,
  interval: 2000,
  maxRuns: spawnerComp.maxEnemies,
  runsSoFar: 0,
});
```

## Ability Cooldown System

```typescript
class AbilityComponent extends Component {
  public cooldownSeconds: number;
  public isReady = true;

  constructor(cooldownSeconds: number) {
    super();
    this.cooldownSeconds = cooldownSeconds;
  }

  public activate(entity: Entity): boolean {
    if (!this.isReady) {
      console.log('Ability on cooldown!');
      return false;
    }

    // Activate ability
    console.log('Ability activated!');
    this.isReady = false;

    // Start cooldown
    const timerComponent = entity.getComponentRequired(TimerComponent);
    timerComponent.addTask({
      callback: () => {
        this.isReady = true;
        console.log('Ability ready!');
      },
      delay: this.cooldownSeconds * 1000,
      elapsed: 0,
    });

    return true;
  }
}

// Usage
const player = world.buildAndAddEntity([
  new AbilityComponent(5), // 5 second cooldown
  new TimerComponent(),
]);

const ability = player.getComponentRequired(AbilityComponent);

// Activate ability
ability.activate(player); // "Ability activated!"
ability.activate(player); // "Ability on cooldown!"

// After 5 seconds: "Ability ready!"
```

## Buff/Debuff System

```typescript
class StatsComponent extends Component {
  public baseSpeed = 100;
  public speedMultiplier = 1.0;

  get effectiveSpeed(): number {
    return this.baseSpeed * this.speedMultiplier;
  }
}

function applySpeedBoost(
  entity: Entity,
  multiplier: number,
  durationMs: number,
): void {
  const stats = entity.getComponentRequired(StatsComponent);
  const timer = entity.getComponentRequired(TimerComponent);

  // Apply boost
  stats.speedMultiplier = multiplier;
  console.log(`Speed boost applied! Speed: ${stats.effectiveSpeed}`);

  // Remove boost after duration
  timer.addTask({
    callback: () => {
      stats.speedMultiplier = 1.0;
      console.log(`Speed boost expired. Speed: ${stats.effectiveSpeed}`);
    },
    delay: durationMs,
    elapsed: 0,
  });
}

// Usage
const player = world.buildAndAddEntity([
  new StatsComponent(),
  new TimerComponent(),
]);

// Apply 2x speed boost for 10 seconds
applySpeedBoost(player, 2.0, 10000);
```

## Blinking Effect

```typescript
class VisibilityComponent extends Component {
  public isVisible = true;
}

function startBlinking(
  entity: Entity,
  blinkCount: number,
  intervalMs: number,
): void {
  const visibility = entity.getComponentRequired(VisibilityComponent);
  const timer = entity.getComponentRequired(TimerComponent);

  timer.addTask({
    callback: () => {
      // Toggle visibility
      visibility.isVisible = !visibility.isVisible;
    },
    delay: intervalMs,
    elapsed: 0,
    repeat: true,
    interval: intervalMs,
    maxRuns: blinkCount * 2, // Multiply by 2 to account for on/off toggles
    runsSoFar: 0,
  });
}

// Usage
const item = world.buildAndAddEntity([
  new VisibilityComponent(),
  new TimerComponent(),
]);

// Blink 5 times, every 200ms
startBlinking(item, 5, 200);
```

## Delayed Event Sequence

```typescript
class GameStateComponent extends Component {
  public state: 'intro' | 'countdown' | 'playing' | 'gameover' = 'intro';
}

const gameState = world.buildAndAddEntity([
  new GameStateComponent(),
  new TimerComponent(),
]);

const state = gameState.getComponentRequired(GameStateComponent);
const timer = gameState.getComponentRequired(TimerComponent);

// Show intro
console.log('Welcome to the game!');

// Transition to countdown after 2 seconds
timer.addTask({
  callback: () => {
    state.state = 'countdown';
    console.log('Get ready...');
  },
  delay: 2000,
  elapsed: 0,
});

// Show countdown messages
timer.addTask({
  callback: () => console.log('3...'),
  delay: 3000,
  elapsed: 0,
});

timer.addTask({
  callback: () => console.log('2...'),
  delay: 4000,
  elapsed: 0,
});

timer.addTask({
  callback: () => console.log('1...'),
  delay: 5000,
  elapsed: 0,
});

// Start game after countdown
timer.addTask({
  callback: () => {
    state.state = 'playing';
    console.log('GO!');
  },
  delay: 6000,
  elapsed: 0,
});
```

## Periodic Auto-save

```typescript
class SaveComponent extends Component {
  public saveCount = 0;

  public save(): void {
    this.saveCount++;
    console.log(`Game saved! (Save #${this.saveCount})`);
    // Implement actual save logic here
  }
}

const saveManager = world.buildAndAddEntity([
  new SaveComponent(),
  new TimerComponent(),
]);

const saveComp = saveManager.getComponentRequired(SaveComponent);
const saveTimer = saveManager.getComponentRequired(TimerComponent);

// Auto-save every 30 seconds
saveTimer.addTask({
  callback: () => {
    saveComp.save();
  },
  delay: 30000, // First save after 30 seconds
  elapsed: 0,
  repeat: true,
  interval: 30000, // Then every 30 seconds
  runsSoFar: 0,
});
```

## Combo Timer

```typescript
class ComboComponent extends Component {
  public comboCount = 0;
  private resetTimerId: number | null = null;

  public addCombo(entity: Entity): void {
    this.comboCount++;
    console.log(`Combo: ${this.comboCount}x`);

    const timer = entity.getComponentRequired(TimerComponent);

    // Reset combo after 2 seconds of no hits
    timer.addTask({
      callback: () => {
        console.log(`Combo ended at ${this.comboCount}x`);
        this.comboCount = 0;
      },
      delay: 2000,
      elapsed: 0,
    });
  }
}

// Usage
const combat = world.buildAndAddEntity([
  new ComboComponent(),
  new TimerComponent(),
]);

const combo = combat.getComponentRequired(ComboComponent);

// Simulate hits
combo.addCombo(combat); // "Combo: 1x"
// ... wait 0.5 seconds ...
combo.addCombo(combat); // "Combo: 2x"
// ... wait 0.5 seconds ...
combo.addCombo(combat); // "Combo: 3x"
// ... wait 2+ seconds ...
// "Combo ended at 3x"
```

## Tips

- Initialize `elapsed` to `0` and `runsSoFar` to `0` for new tasks
- Use milliseconds for all time values
- For repeating timers, set both `repeat: true` and provide an `interval`
- The `delay` is the initial delay, `interval` is for subsequent repeats
- Tasks execute callbacks synchronously within the frame
- Multiple timers can coexist on the same entity
