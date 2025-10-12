---
sidebar_position: 1
---

# Events

Forge provides an event system for decoupled communication between different parts of your game.

## Event Types

### ForgeEvent

Simple events with no parameters:

```ts
import { ForgeEvent } from '@forge-game-engine/forge';

const onGameStart = new ForgeEvent('GameStart');

// Register listener
onGameStart.registerListener(() => {
  console.log('Game started!');
});

// Raise event
onGameStart.raise();
```

### ParameterizedForgeEvent

Events that pass typed data:

```ts
import { ParameterizedForgeEvent } from '@forge-game-engine/forge';

const onScoreChanged = new ParameterizedForgeEvent<number>('ScoreChanged');

// Register listener
onScoreChanged.registerListener((newScore) => {
  console.log('Score:', newScore);
});

// Raise with data
onScoreChanged.raise(1000);
```

## Multiple Listeners

```ts
const onPlayerDeath = new ForgeEvent('PlayerDeath');

onPlayerDeath.registerListener(() => {
  console.log('Player died!');
});

onPlayerDeath.registerListener(() => {
  showGameOver();
});

// All listeners called
onPlayerDeath.raise();
```

## Complex Event Data

```ts
interface DamageEvent {
  amount: number;
  source: Entity;
  target: Entity;
}

const onDamageTaken = new ParameterizedForgeEvent<DamageEvent>('DamageTaken');

onDamageTaken.registerListener((data) => {
  console.log(`${data.target.name} took ${data.amount} damage`);
  applyDamageEffect(data);
});

onDamageTaken.raise({
  amount: 50,
  source: enemyEntity,
  target: playerEntity
});
```

## Using Events in ECS

### Component Events

```ts
class HealthComponent implements Component {
  name = Symbol('Health');
  current: number;
  max: number;
  
  onDamage = new ParameterizedForgeEvent<number>('Damage');
  onDeath = new ForgeEvent('Death');
  
  constructor(max: number) {
    this.max = max;
    this.current = max;
  }
}

// In a system
class DamageSystem extends System {
  constructor() {
    super('damage', [HealthComponent.symbol]);
  }
  
  applyDamage(entity: Entity, amount: number) {
    const health = entity.getComponent(HealthComponent);
    health.current -= amount;
    health.onDamage.raise(amount);
    
    if (health.current <= 0) {
      health.current = 0;
      health.onDeath.raise();
    }
  }
}
```

### System Events

```ts
class CollisionSystem extends System {
  onCollision = new ParameterizedForgeEvent<{
    entityA: Entity;
    entityB: Entity;
  }>('Collision');
  
  constructor() {
    super('collision', [ColliderComponent.symbol]);
  }
  
  beforeAll() {
    // Check collisions
    if (collision) {
      this.onCollision.raise({
        entityA,
        entityB
      });
    }
  }
}

// Listen to collisions
const collisionSystem = new CollisionSystem();
collisionSystem.onCollision.registerListener(({ entityA, entityB }) => {
  handleCollision(entityA, entityB);
});

world.addSystem(collisionSystem);
```

## Removing Listeners

```ts
const handler = (score: number) => {
  console.log('Score:', score);
};

// Add listener
onScoreChanged.registerListener(handler);

// Remove specific listener
onScoreChanged.deregisterListener(handler);

// Remove all listeners
onScoreChanged.clear();
```

## Event Dispatcher

Manage multiple events:

```ts
import { EventDispatcher, ParameterizedForgeEvent } from '@forge-game-engine/forge';

interface GameEvent {
  type: string;
  timestamp: number;
}

const dispatcher = new EventDispatcher<GameEvent>();

const levelComplete = new ParameterizedForgeEvent<GameEvent>('LevelComplete');
dispatcher.addEventListener('level-complete', levelComplete);

levelComplete.registerListener((event) => {
  console.log('Level completed at', event.timestamp);
});

dispatcher.dispatchEvent('level-complete', {
  type: 'level-complete',
  timestamp: Date.now()
});
```

## See Also

- [ForgeEvent API](../../api/classes/ForgeEvent.md)
- [ParameterizedForgeEvent API](../../api/classes/ParameterizedForgeEvent.md)
- [EventDispatcher API](../../api/classes/EventDispatcher.md)
