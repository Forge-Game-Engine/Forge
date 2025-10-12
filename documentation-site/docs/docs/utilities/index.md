---
sidebar_position: 1
---

# Utilities

Forge provides a collection of utility functions and classes to simplify common programming tasks.

## Type Checking

### isString

Check if a value is a string:

```ts
import { isString } from '@forge-game-engine/forge';

isString('hello');  // true
isString(123);      // false
isString(null);     // false
```

### isNumber

Check if a value is a number:

```ts
import { isNumber } from '@forge-game-engine/forge';

isNumber(42);       // true
isNumber(3.14);     // true
isNumber('42');     // false
isNumber(NaN);      // false
```

### isOneOf

Check if a value is one of several options:

```ts
import { isOneOf } from '@forge-game-engine/forge';

const validStates = ['idle', 'walking', 'running'] as const;

isOneOf('walking', validStates);  // true
isOneOf('flying', validStates);   // false

// Use with type narrowing
function setState(state: string) {
  if (isOneOf(state, validStates)) {
    // TypeScript knows state is 'idle' | 'walking' | 'running'
    console.log('Valid state:', state);
  }
}
```

## Array Utilities

### enforceArray

Ensure a value is an array:

```ts
import { enforceArray } from '@forge-game-engine/forge';

// Single value becomes array
enforceArray(5);           // [5]
enforceArray('hello');     // ['hello']

// Array stays as array
enforceArray([1, 2, 3]);   // [1, 2, 3]

// Useful for flexible API parameters
function addItems(items: number | number[]) {
  const itemArray = enforceArray(items);
  itemArray.forEach(item => console.log(item));
}

addItems(5);           // Works with single value
addItems([1, 2, 3]);   // Works with array
```

### atLeastOne

Ensure at least one element exists in an array (TypeScript type utility):

```ts
import { AtLeastOne } from '@forge-game-engine/forge';

// Type that requires at least one element
type NonEmptyArray = AtLeastOne<string>;

const valid: NonEmptyArray = ['item'];           // ✓ Valid
const alsoValid: NonEmptyArray = ['a', 'b'];     // ✓ Valid
// const invalid: NonEmptyArray = [];            // ✗ Type error
```

## Chain

Execute a series of functions in sequence:

```ts
import { Chain } from '@forge-game-engine/forge';

// Create a processing chain
const result = await new Chain(10)
  .add((n) => n * 2)       // 20
  .add((n) => n + 5)       // 25
  .add((n) => n.toString()) // "25"
  .execute();

console.log(result); // "25"
```

### Async Chains

Chains work with async functions:

```ts
const result = await new Chain('user-123')
  .add(async (id) => await fetchUser(id))
  .add((user) => user.name)
  .add((name) => name.toUpperCase())
  .execute();

console.log(result); // "JOHN DOE"
```

### Data Transformation Pipeline

```ts
interface UserData {
  id: string;
  age: number;
  email: string;
}

interface ProcessedUser {
  id: string;
  isAdult: boolean;
  emailDomain: string;
}

async function processUser(userId: string): Promise<ProcessedUser> {
  return await new Chain(userId)
    .add(async (id) => await fetchUserData(id))
    .add((user: UserData) => ({
      id: user.id,
      isAdult: user.age >= 18,
      emailDomain: user.email.split('@')[1]
    }))
    .execute();
}
```

## DOM Utilities

### createContainer

Create and append a div element to the document:

```ts
import { createContainer } from '@forge-game-engine/forge';

// Create a container for UI
const uiContainer = createContainer('game-ui');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '10px';
uiContainer.style.left = '10px';

// Add content
uiContainer.innerHTML = '<h1>Game Title</h1>';
```

## Practical Examples

### Flexible Function Parameters

Use `enforceArray` for APIs that accept single or multiple values:

```ts
import { enforceArray } from '@forge-game-engine/forge';

class Inventory {
  private items: string[] = [];
  
  addItem(items: string | string[]) {
    const itemArray = enforceArray(items);
    this.items.push(...itemArray);
  }
}

const inventory = new Inventory();
inventory.addItem('sword');              // Add single item
inventory.addItem(['potion', 'shield']); // Add multiple items
```

### Input Validation

Combine type guards for robust validation:

```ts
import { isString, isNumber, isOneOf } from '@forge-game-engine/forge';

interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  maxPlayers: number;
  gameName: string;
}

function validateConfig(config: unknown): config is GameConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  const c = config as Partial<GameConfig>;
  
  return (
    isOneOf(c.difficulty, ['easy', 'medium', 'hard']) &&
    isNumber(c.maxPlayers) &&
    isString(c.gameName)
  );
}

// Usage
const userConfig = JSON.parse(userInput);

if (validateConfig(userConfig)) {
  // TypeScript knows it's GameConfig
  console.log(userConfig.difficulty);
} else {
  console.error('Invalid configuration');
}
```

### Processing Pipeline

Use `Chain` for data transformation:

```ts
import { Chain } from '@forge-game-engine/forge';

async function loadAndProcessLevel(levelId: string) {
  return await new Chain(levelId)
    .add(async (id) => await fetch(`/levels/${id}.json`))
    .add((response) => response.json())
    .add((data) => validateLevelData(data))
    .add((level) => {
      // Transform level data
      return {
        ...level,
        entities: level.entities.map(parseEntity),
        spawns: level.spawns.map(parseSpawnPoint)
      };
    })
    .execute();
}
```

### Conditional Chain Steps

```ts
class DataProcessor {
  async process(data: unknown, options: ProcessOptions) {
    const chain = new Chain(data)
      .add((d) => this.validate(d));
    
    if (options.sanitize) {
      chain.add((d) => this.sanitize(d));
    }
    
    if (options.transform) {
      chain.add((d) => this.transform(d));
    }
    
    chain.add((d) => this.finalize(d));
    
    return await chain.execute();
  }
}
```

### Type-Safe State Machine

```ts
import { isOneOf } from '@forge-game-engine/forge';

type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

class StateMachine {
  private currentState: GameState = 'menu';
  private readonly validTransitions: Record<GameState, GameState[]> = {
    menu: ['playing'],
    playing: ['paused', 'gameOver'],
    paused: ['playing', 'menu'],
    gameOver: ['menu']
  };
  
  setState(newState: string): boolean {
    // Type guard ensures type safety
    if (!isOneOf(newState, ['menu', 'playing', 'paused', 'gameOver'])) {
      console.error('Invalid state:', newState);
      return false;
    }
    
    // Check if transition is allowed
    const allowedStates = this.validTransitions[this.currentState];
    if (!isOneOf(newState, allowedStates)) {
      console.error(`Cannot transition from ${this.currentState} to ${newState}`);
      return false;
    }
    
    this.currentState = newState;
    return true;
  }
}
```

### Batch Processing

```ts
import { enforceArray } from '@forge-game-engine/forge';

class EntityManager {
  removeEntities(entities: Entity | Entity[]) {
    const entityArray = enforceArray(entities);
    
    // Process all entities uniformly
    entityArray.forEach(entity => {
      this.world.removeEntity(entity);
    });
    
    console.log(`Removed ${entityArray.length} entities`);
  }
}

// Usage
manager.removeEntities(singleEntity);      // Remove one
manager.removeEntities([entity1, entity2]); // Remove multiple
```

### Creating UI Layers

```ts
import { createContainer } from '@forge-game-engine/forge';

class UIManager {
  private layers = new Map<string, HTMLDivElement>();
  
  createLayer(name: string, zIndex: number): HTMLDivElement {
    const layer = createContainer(`ui-layer-${name}`);
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.width = '100%';
    layer.style.height = '100%';
    layer.style.zIndex = zIndex.toString();
    layer.style.pointerEvents = 'none';
    
    this.layers.set(name, layer);
    return layer;
  }
  
  getLayer(name: string): HTMLDivElement | undefined {
    return this.layers.get(name);
  }
}

// Usage
const uiManager = new UIManager();
const hudLayer = uiManager.createLayer('hud', 100);
const menuLayer = uiManager.createLayer('menu', 200);
```

## Best Practices

- **Use type guards** - `isString`, `isNumber`, `isOneOf` for runtime type checking
- **Enforce arrays** - Use `enforceArray` for flexible API parameters
- **Chain operations** - Use `Chain` for sequential data transformations
- **Validate early** - Check types and values at boundaries (API inputs, user input)
- **Create reusable utilities** - Build on these primitives for your game-specific needs
- **Type safety** - Leverage TypeScript's type system with these utilities

## See Also

- [enforceArray API](../../api/functions/enforceArray.md)
- [isString API](../../api/functions/isString.md)
- [isNumber API](../../api/functions/isNumber.md)
- [isOneOf API](../../api/functions/isOneOf.md)
- [Chain API](../../api/classes/Chain.md)
- [createContainer API](../../api/functions/createContainer.md)
