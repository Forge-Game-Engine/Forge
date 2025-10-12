---
sidebar_position: 1
---

# UI

Forge provides UI utilities for working with [Rive](https://rive.app/) interactive graphics. The UI module helps manage Rive properties and create reactive UI elements.

## Overview

The UI system provides:

- **Model Properties** - Reactive wrappers for Rive properties
- **Property Types** - Number, string, enum, and trigger properties
- **Change Events** - React to property value changes
- **Two-way Binding** - Sync game state with UI

:::info
The UI module is specifically designed for Rive-based UI. For HTML/DOM UI, you can use standard web technologies alongside Forge.
:::

## Prerequisites

To use the UI module, you need:

```bash
npm install @rive-app/webgl2
```

## Model Properties

Model properties wrap Rive properties and provide change events:

### Number Property

```ts
import { NumberModelProperty } from '@forge-game-engine/forge';

// Assuming you have a Rive stateMachine and property
const healthProperty = stateMachine.input('health');
const health = new NumberModelProperty(healthProperty);

// Listen to changes
health.onChangeEvent.registerListener((newValue) => {
  console.log('Health changed to:', newValue);
  updatePlayerHealth(newValue);
});

// Set value (updates Rive and triggers event)
health.value = 75;

// Get value
console.log('Current health:', health.value);
```

### String Property

```ts
import { StringModelProperty } from '@forge-game-engine/forge';

const nameProperty = stateMachine.input('playerName');
const name = new StringModelProperty(nameProperty);

name.onChangeEvent.registerListener((newName) => {
  console.log('Name changed to:', newName);
});

name.value = 'Hero';
```

### Enum Property

```ts
import { EnumModelProperty } from '@forge-game-engine/forge';

const stateProperty = stateMachine.input('gameState');
const state = new EnumModelProperty(stateProperty);

state.onChangeEvent.registerListener((newState) => {
  console.log('State changed to:', newState);
  
  switch(newState) {
    case 0:
      console.log('Menu');
      break;
    case 1:
      console.log('Playing');
      break;
    case 2:
      console.log('Paused');
      break;
  }
});

state.value = 1; // Set to "Playing"
```

### Trigger Property

```ts
import { ModelTrigger } from '@forge-game-engine/forge';

const buttonClickTrigger = stateMachine.input('buttonClick');
const trigger = new ModelTrigger(buttonClickTrigger);

trigger.onChangeEvent.registerListener(() => {
  console.log('Button clicked!');
  handleButtonClick();
});

// Fire the trigger
trigger.fire();
```

## Practical Examples

### Health Bar UI

```ts
import { 
  NumberModelProperty,
  RiveCache 
} from '@forge-game-engine/forge';

class HealthBarUI {
  private health: NumberModelProperty;
  
  async init(riveCache: RiveCache) {
    // Load Rive file
    const riveFile = await riveCache.getOrLoad('ui/health-bar.riv');
    const artboard = riveFile.defaultArtboard();
    const stateMachine = artboard.stateMachineByName('HealthStateMachine');
    
    // Get health property
    const healthInput = stateMachine.input('health');
    this.health = new NumberModelProperty(healthInput);
    
    // Listen for changes
    this.health.onChangeEvent.registerListener((value) => {
      console.log(`Health: ${value}%`);
    });
    
    // Initialize
    this.health.value = 100;
  }
  
  takeDamage(amount: number) {
    this.health.value = Math.max(0, this.health.value - amount);
  }
  
  heal(amount: number) {
    this.health.value = Math.min(100, this.health.value + amount);
  }
}
```

### Menu System

```ts
import {
  EnumModelProperty,
  ModelTrigger,
  RiveCache
} from '@forge-game-engine/forge';

class MenuSystem {
  private menuState: EnumModelProperty;
  private playButton: ModelTrigger;
  private settingsButton: ModelTrigger;
  
  async init(riveCache: RiveCache) {
    const riveFile = await riveCache.getOrLoad('ui/menu.riv');
    const artboard = riveFile.defaultArtboard();
    const stateMachine = artboard.stateMachineByName('MenuStateMachine');
    
    // Setup state property
    this.menuState = new EnumModelProperty(
      stateMachine.input('menuState')
    );
    
    this.menuState.onChangeEvent.registerListener((state) => {
      this.handleStateChange(state);
    });
    
    // Setup buttons
    this.playButton = new ModelTrigger(
      stateMachine.input('playButton')
    );
    
    this.playButton.onChangeEvent.registerListener(() => {
      this.startGame();
    });
    
    this.settingsButton = new ModelTrigger(
      stateMachine.input('settingsButton')
    );
    
    this.settingsButton.onChangeEvent.registerListener(() => {
      this.openSettings();
    });
  }
  
  private handleStateChange(state: number) {
    // 0 = Main, 1 = Settings, 2 = Playing
    console.log('Menu state:', state);
  }
  
  private startGame() {
    this.menuState.value = 2; // Playing
    console.log('Starting game...');
  }
  
  private openSettings() {
    this.menuState.value = 1; // Settings
    console.log('Opening settings...');
  }
}
```

### Score Display

```ts
import { NumberModelProperty, RiveCache } from '@forge-game-engine/forge';

class ScoreUI {
  private score: NumberModelProperty;
  
  async init(riveCache: RiveCache) {
    const riveFile = await riveCache.getOrLoad('ui/score.riv');
    const artboard = riveFile.defaultArtboard();
    const stateMachine = artboard.stateMachineByName('ScoreStateMachine');
    
    this.score = new NumberModelProperty(
      stateMachine.input('score')
    );
    
    this.score.onChangeEvent.registerListener((newScore) => {
      console.log('Score updated:', newScore);
      this.playScoreAnimation();
    });
    
    this.score.value = 0;
  }
  
  addPoints(points: number) {
    this.score.value += points;
  }
  
  private playScoreAnimation() {
    // Trigger score increase animation in Rive
  }
}

// Usage in game
const scoreUI = new ScoreUI();
await scoreUI.init(riveCache);

// When player scores
scoreUI.addPoints(100);
```

### Game State Synchronization

Sync game state with UI:

```ts
import { EnumModelProperty } from '@forge-game-engine/forge';

type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

class GameStateManager {
  private currentState: GameState = 'menu';
  private uiState: EnumModelProperty;
  
  async init(riveCache: RiveCache) {
    const riveFile = await riveCache.getOrLoad('ui/game-ui.riv');
    const artboard = riveFile.defaultArtboard();
    const stateMachine = artboard.stateMachineByName('GameStateMachine');
    
    this.uiState = new EnumModelProperty(
      stateMachine.input('gameState')
    );
    
    // Sync UI changes back to game
    this.uiState.onChangeEvent.registerListener((enumValue) => {
      const states: GameState[] = ['menu', 'playing', 'paused', 'gameOver'];
      this.currentState = states[enumValue];
      console.log('Game state:', this.currentState);
    });
  }
  
  setState(state: GameState) {
    this.currentState = state;
    
    // Map to enum value
    const stateMap = {
      'menu': 0,
      'playing': 1,
      'paused': 2,
      'gameOver': 3
    };
    
    this.uiState.value = stateMap[state];
  }
}
```

## Complete Example

```ts
import {
  Game,
  createWorld,
  RiveCache,
  NumberModelProperty,
  ModelTrigger
} from '@forge-game-engine/forge';

async function setupGameUI() {
  const game = new Game();
  const { world } = createWorld('main', game);
  
  // Load Rive UI
  const riveCache = new RiveCache();
  const riveFile = await riveCache.getOrLoad('ui/game-hud.riv');
  const artboard = riveFile.defaultArtboard();
  const stateMachine = artboard.stateMachineByName('HUDStateMachine');
  
  // Setup health
  const health = new NumberModelProperty(
    stateMachine.input('health')
  );
  health.value = 100;
  
  // Setup score
  const score = new NumberModelProperty(
    stateMachine.input('score')
  );
  score.value = 0;
  
  // Setup pause button
  const pauseButton = new ModelTrigger(
    stateMachine.input('pauseButton')
  );
  
  pauseButton.onChangeEvent.registerListener(() => {
    world.time.timeScale = world.time.timeScale === 0 ? 1 : 0;
    console.log('Game paused:', world.time.timeScale === 0);
  });
  
  // Connect to game events
  health.onChangeEvent.registerListener((hp) => {
    if (hp <= 0) {
      console.log('Game Over!');
    }
  });
  
  // Simulate gameplay
  setInterval(() => {
    score.value += 10;
    health.value -= 5;
  }, 1000);
  
  game.run();
}

setupGameUI();
```

## Best Practices

- **Use Rive for complex UI** - Rive excels at animated, interactive UI
- **Separate UI logic** - Keep UI code separate from game logic
- **Listen to changes** - Use events to react to UI interactions
- **Validate inputs** - Ensure property values are within expected ranges
- **Handle async loading** - Load Rive files during game initialization
- **Clean up listeners** - Remove event listeners when UI is destroyed
- **Cache Rive files** - Use RiveCache for efficient loading

## HTML UI Alternative

For simpler UI needs, you can use HTML/DOM:

```ts
import { createContainer } from '@forge-game-engine/forge';

// Create HTML container
const uiContainer = createContainer('game-ui');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '10px';
uiContainer.style.left = '10px';
uiContainer.style.color = 'white';
uiContainer.style.fontSize = '24px';

// Update UI
function updateScore(score: number) {
  uiContainer.textContent = `Score: ${score}`;
}
```

## See Also

- [ModelProperty API](../../api/classes/ModelProperty.md)
- [NumberModelProperty API](../../api/classes/NumberModelProperty.md)
- [StringModelProperty API](../../api/classes/StringModelProperty.md)
- [EnumModelProperty API](../../api/classes/EnumModelProperty.md)
- [ModelTrigger API](../../api/classes/ModelTrigger.md)
- [RiveCache API](../../api/classes/RiveCache.md)
- [Rive Documentation](https://rive.app/community/doc/)
