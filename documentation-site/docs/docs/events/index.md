---
sidebar_position: 1
---

# Events

Forge provides a robust event system for decoupling game logic and enabling communication between different parts of your game. The event system includes simple events and parameterized events that can pass data.

## Event Types

Forge has two main event classes:

1. **[`ForgeEvent`](../../api/classes/ForgeEvent.md)** - Simple events with no parameters
2. **[`ParameterizedForgeEvent<T>`](../../api/classes/ParameterizedForgeEvent.md)** - Events that pass typed data to listeners

## Basic Events

Use `ForgeEvent` for simple notifications that don't need to pass data:

```ts
import { ForgeEvent } from '@forge-game-engine/forge';

// Create an event
const onGameStart = new ForgeEvent('GameStart');

// Register a listener
onGameStart.registerListener(() => {
  console.log('Game started!');
});

// Raise the event
onGameStart.raise();
```

### Multiple Listeners

Events can have multiple listeners:

```ts
const onPlayerDeath = new ForgeEvent('PlayerDeath');

// Register multiple listeners
onPlayerDeath.registerListener(() => {
  console.log('Player died!');
});

onPlayerDeath.registerListener(() => {
  // Show game over screen
  showGameOver();
});

onPlayerDeath.registerListener(() => {
  // Stop background music
  stopMusic();
});

// All listeners will be called when event is raised
onPlayerDeath.raise();
```

### Removing Listeners

```ts
const onPause = new ForgeEvent('Pause');

const pauseHandler = () => {
  console.log('Game paused');
};

// Add listener
onPause.registerListener(pauseHandler);

// Later, remove it
onPause.deregisterListener(pauseHandler);

// Clear all listeners
onPause.clear();
```

## Parameterized Events

Use `ParameterizedForgeEvent<T>` when you need to pass data to listeners:

```ts
import { ParameterizedForgeEvent } from '@forge-game-engine/forge';

// Create a parameterized event with a number type
const onScoreChanged = new ParameterizedForgeEvent<number>('ScoreChanged');

// Register a listener that receives the score
onScoreChanged.registerListener((newScore) => {
  console.log('Score changed to:', newScore);
  updateScoreDisplay(newScore);
});

// Raise the event with data
onScoreChanged.raise(1000);
```

### Complex Event Data

Pass objects for more complex event data:

```ts
interface DamageEvent {
  amount: number;
  source: Entity;
  target: Entity;
  damageType: 'physical' | 'magic' | 'fire';
}

const onDamageTaken = new ParameterizedForgeEvent<DamageEvent>('DamageTaken');

onDamageTaken.registerListener((data) => {
  console.log(`${data.target.name} took ${data.amount} ${data.damageType} damage`);
  
  // Apply damage effects
  applyDamageEffect(data);
  
  // Show damage number
  showDamageNumber(data.target, data.amount);
});

// Raise with complex data
onDamageTaken.raise({
  amount: 50,
  source: enemyEntity,
  target: playerEntity,
  damageType: 'fire'
});
```

## Event Dispatcher

The [`EventDispatcher`](../../api/classes/EventDispatcher.md) manages multiple events of the same data type:

```ts
import { EventDispatcher, ParameterizedForgeEvent } from '@forge-game-engine/forge';

interface GameEvent {
  type: string;
  timestamp: number;
  data?: any;
}

const gameEventDispatcher = new EventDispatcher<GameEvent>();

// Create events
const levelCompleteEvent = new ParameterizedForgeEvent<GameEvent>('LevelComplete');
const enemyDefeatedEvent = new ParameterizedForgeEvent<GameEvent>('EnemyDefeated');

// Add event listeners to dispatcher
gameEventDispatcher.addEventListener('level-complete', levelCompleteEvent);
gameEventDispatcher.addEventListener('enemy-defeated', enemyDefeatedEvent);

// Register listeners to the events
levelCompleteEvent.registerListener((event) => {
  console.log('Level completed at', event.timestamp);
});

enemyDefeatedEvent.registerListener((event) => {
  console.log('Enemy defeated:', event.data);
});

// Dispatch events
gameEventDispatcher.dispatchEvent('level-complete', {
  type: 'level-complete',
  timestamp: Date.now()
});

gameEventDispatcher.dispatchEvent('enemy-defeated', {
  type: 'enemy-defeated',
  timestamp: Date.now(),
  data: { enemyId: 'goblin-42' }
});
```

## Using Events with ECS

Events are particularly useful in ECS for communication between systems:

### Entity Events

```ts
import { Entity, Component, ParameterizedForgeEvent } from '@forge-game-engine/forge';

class HealthComponent implements Component {
  name = Symbol('Health');
  current: number;
  max: number;
  
  // Events on the component
  onDamage = new ParameterizedForgeEvent<number>('Damage');
  onHeal = new ParameterizedForgeEvent<number>('Heal');
  onDeath = new ForgeEvent('Death');
  
  constructor(max: number) {
    this.max = max;
    this.current = max;
  }
  
  takeDamage(amount: number) {
    this.current -= amount;
    this.onDamage.raise(amount);
    
    if (this.current <= 0) {
      this.current = 0;
      this.onDeath.raise();
    }
  }
  
  heal(amount: number) {
    const oldHealth = this.current;
    this.current = Math.min(this.current + amount, this.max);
    const actualHealing = this.current - oldHealth;
    
    if (actualHealing > 0) {
      this.onHeal.raise(actualHealing);
    }
  }
}

// Usage
const health = entity.getComponent(HealthComponent);

health.onDamage.registerListener((amount) => {
  console.log(`Took ${amount} damage!`);
  playDamageSound();
});

health.onDeath.registerListener(() => {
  console.log('Entity died!');
  spawnDeathAnimation(entity);
});

health.takeDamage(25);
```

### System Events

```ts
import { System, Entity, ParameterizedForgeEvent } from '@forge-game-engine/forge';

class CollisionSystem extends System {
  onCollision = new ParameterizedForgeEvent<{
    entityA: Entity;
    entityB: Entity;
  }>('Collision');
  
  constructor() {
    super('collision', [PositionComponent.symbol, ColliderComponent.symbol]);
  }
  
  beforeAll() {
    // Check for collisions between entities
    const entities = this.entities;
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (this.checkCollision(entities[i], entities[j])) {
          // Raise collision event
          this.onCollision.raise({
            entityA: entities[i],
            entityB: entities[j]
          });
        }
      }
    }
  }
  
  private checkCollision(a: Entity, b: Entity): boolean {
    // Collision detection logic
    return false;
  }
}

// Listen to collision events
const collisionSystem = new CollisionSystem();

collisionSystem.onCollision.registerListener(({ entityA, entityB }) => {
  console.log(`Collision between ${entityA.name} and ${entityB.name}`);
  
  // Handle collision
  handleCollision(entityA, entityB);
});

world.addSystem(collisionSystem);
```

## Complete Examples

### Input Event System

```ts
import { ParameterizedForgeEvent } from '@forge-game-engine/forge';

interface KeyEvent {
  key: string;
  pressed: boolean;
  timestamp: number;
}

class InputEventManager {
  onKeyDown = new ParameterizedForgeEvent<KeyEvent>('KeyDown');
  onKeyUp = new ParameterizedForgeEvent<KeyEvent>('KeyUp');
  
  constructor() {
    this.setupListeners();
  }
  
  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.onKeyDown.raise({
        key: e.key,
        pressed: true,
        timestamp: Date.now()
      });
    });
    
    window.addEventListener('keyup', (e) => {
      this.onKeyUp.raise({
        key: e.key,
        pressed: false,
        timestamp: Date.now()
      });
    });
  }
}

// Usage
const inputManager = new InputEventManager();

inputManager.onKeyDown.registerListener((event) => {
  if (event.key === ' ') {
    playerJump();
  }
});
```

### Achievement System

```ts
interface Achievement {
  id: string;
  name: string;
  description: string;
}

class AchievementManager {
  private achievements = new Map<string, Achievement>();
  private unlocked = new Set<string>();
  
  onAchievementUnlocked = new ParameterizedForgeEvent<Achievement>('AchievementUnlocked');
  
  registerAchievement(achievement: Achievement) {
    this.achievements.set(achievement.id, achievement);
  }
  
  unlock(achievementId: string) {
    if (this.unlocked.has(achievementId)) {
      return; // Already unlocked
    }
    
    const achievement = this.achievements.get(achievementId);
    if (achievement) {
      this.unlocked.add(achievementId);
      this.onAchievementUnlocked.raise(achievement);
    }
  }
}

// Usage
const achievements = new AchievementManager();

achievements.registerAchievement({
  id: 'first-enemy',
  name: 'First Blood',
  description: 'Defeat your first enemy'
});

achievements.onAchievementUnlocked.registerListener((achievement) => {
  console.log(`Achievement unlocked: ${achievement.name}`);
  showAchievementNotification(achievement);
});

// Unlock when condition is met
achievements.unlock('first-enemy');
```

### Game State Manager with Events

```ts
type GameState = 'menu' | 'playing' | 'paused' | 'game-over';

class GameStateManager {
  private currentState: GameState = 'menu';
  
  onStateChanged = new ParameterizedForgeEvent<{
    from: GameState;
    to: GameState;
  }>('StateChanged');
  
  setState(newState: GameState) {
    if (this.currentState === newState) {
      return;
    }
    
    const oldState = this.currentState;
    this.currentState = newState;
    
    this.onStateChanged.raise({
      from: oldState,
      to: newState
    });
  }
  
  getState(): GameState {
    return this.currentState;
  }
}

// Usage
const gameState = new GameStateManager();

gameState.onStateChanged.registerListener(({ from, to }) => {
  console.log(`Game state changed: ${from} -> ${to}`);
  
  if (to === 'playing') {
    startGameplay();
  } else if (to === 'paused') {
    showPauseMenu();
  }
});

gameState.setState('playing');
```

## Best Practices

- **Use events for decoupling** - Events help separate concerns and reduce dependencies
- **Name events clearly** - Use descriptive names that indicate what happened
- **Clean up listeners** - Remove listeners when they're no longer needed to prevent memory leaks
- **Handle errors gracefully** - Event listeners can throw errors; handle them appropriately
- **Use typed events** - `ParameterizedForgeEvent<T>` provides type safety for event data
- **Document event contracts** - Clearly document what data events will pass
- **Avoid circular events** - Be careful not to create event loops where events trigger each other indefinitely
- **Consider performance** - Too many event listeners can impact performance

## Common Patterns

### Event Aggregator

Centralize event management:

```ts
class GameEvents {
  onPlayerSpawn = new ParameterizedForgeEvent<Entity>('PlayerSpawn');
  onEnemySpawn = new ParameterizedForgeEvent<Entity>('EnemySpawn');
  onScoreChange = new ParameterizedForgeEvent<number>('ScoreChange');
  onLevelComplete = new ForgeEvent('LevelComplete');
}

const gameEvents = new GameEvents();
export default gameEvents;
```

### Once Listeners

Create a listener that runs only once:

```ts
function once<T>(event: ParameterizedForgeEvent<T>, callback: (data: T) => void) {
  const listener = (data: T) => {
    callback(data);
    event.deregisterListener(listener);
  };
  event.registerListener(listener);
}

// Usage
once(onGameStart, () => {
  console.log('This only runs once');
});
```

## See Also

- [ForgeEvent API](../../api/classes/ForgeEvent.md)
- [ParameterizedForgeEvent API](../../api/classes/ParameterizedForgeEvent.md)
- [EventDispatcher API](../../api/classes/EventDispatcher.md)
- [ECS Documentation](../ecs/index.md)
