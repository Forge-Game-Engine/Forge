---
sidebar_position: 1
---

# Input

Forge provides a comprehensive input system that handles keyboard, mouse, and other input devices. The input system uses an action-based approach, allowing you to map multiple inputs to game actions and easily remap controls.

## Overview

The input system consists of:

- **Input Actions** - Abstract game actions (jump, shoot, move, etc.)
- **Input Bindings** - Mappings from physical inputs (keys, buttons) to actions
- **Input Groups** - Collections of actions that can be activated/deactivated together
- **Input Manager** - Coordinates all input handling

## Action Types

Forge supports four types of input actions:

1. **TriggerAction** - One-time button press (e.g., jump, shoot)
2. **HoldAction** - Continuous button hold (e.g., sprint, charge)
3. **Axis1dAction** - Single-axis input from -1 to 1 (e.g., horizontal movement)
4. **Axis2dAction** - Two-axis input (e.g., movement with WASD or joystick)

## Basic Setup

### Creating Input Actions

```ts
import {
  InputManager,
  TriggerAction,
  HoldAction,
  Axis1dAction,
  Axis2dAction
} from '@forge-game-engine/forge';

const inputManager = new InputManager();

// Create actions
const jumpAction = new TriggerAction('jump', 'gameplay');
const shootAction = new TriggerAction('shoot', 'gameplay');
const sprintAction = new HoldAction('sprint', 'gameplay');
const moveHorizontal = new Axis1dAction('move-horizontal', 'gameplay');
const moveVertical = new Axis1dAction('move-vertical', 'gameplay');
const move2d = new Axis2dAction('move', 'gameplay');

// Register actions with the input manager
inputManager.addTriggerActions(jumpAction, shootAction);
inputManager.addHoldActions(sprintAction);
inputManager.addAxis1dActions(moveHorizontal, moveVertical);
inputManager.addAxis2dActions(move2d);
```

### Creating Input Bindings

Bind keyboard keys to actions:

```ts
import {
  KeyboardTriggerBinding,
  KeyboardHoldBinding,
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardInputSource
} from '@forge-game-engine/forge';

// Create keyboard input source
const keyboard = new KeyboardInputSource();

// Bind Space to jump
const jumpBinding = new KeyboardTriggerBinding(
  jumpAction,
  ' ', // Space key
  'Space: Jump'
);
keyboard.addTriggerBinding(jumpBinding);

// Bind left mouse to shoot
const shootBinding = new KeyboardTriggerBinding(
  shootAction,
  'Mouse0', // Left mouse button
  'Left Click: Shoot'
);
keyboard.addTriggerBinding(shootBinding);

// Bind Shift to sprint
const sprintBinding = new KeyboardHoldBinding(
  sprintAction,
  'Shift',
  'Shift: Sprint'
);
keyboard.addHoldBinding(sprintBinding);

// Bind WASD for 2D movement
const moveBinding = new KeyboardAxis2dBinding(
  move2d,
  { up: 'w', down: 's', left: 'a', right: 'd' },
  'WASD: Move'
);
keyboard.addAxis2dBinding(moveBinding);

// Register input source with manager
inputManager.addUpdatable(keyboard);
```

### Using Inputs in Your Game

Access input state in your systems:

```ts
import { System, Entity } from '@forge-game-engine/forge';

class PlayerMovementSystem extends System {
  constructor(
    private inputManager: InputManager,
    private moveAction: Axis2dAction,
    private sprintAction: HoldAction
  ) {
    super('player-movement', [PositionComponent.symbol, PlayerComponent.symbol]);
  }
  
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    
    // Get movement input (-1 to 1 on each axis)
    const movement = this.moveAction.value;
    
    // Base speed
    let speed = 100;
    
    // Sprint multiplier
    if (this.sprintAction.isHeld) {
      speed *= 2;
    }
    
    // Apply movement
    position.x += movement.x * speed * this.time.deltaTimeInSeconds;
    position.y += movement.y * speed * this.time.deltaTimeInSeconds;
  }
}
```

## Trigger Actions

Trigger actions fire once when activated:

```ts
const jumpAction = new TriggerAction('jump', 'gameplay');

// Listen to the trigger event
jumpAction.triggerEvent.registerListener(() => {
  console.log('Jump triggered!');
  player.jump();
});

// Or check the state
if (jumpAction.isTriggered) {
  player.jump();
}
```

## Hold Actions

Hold actions track how long a button is held:

```ts
const chargeAction = new HoldAction('charge', 'gameplay');

// Check if held
if (chargeAction.isHeld) {
  // Charge up attack
  chargeLevel += deltaTime;
}

// Check hold duration
if (chargeAction.heldDurationSeconds > 2.0) {
  // Release fully charged attack
  player.releaseChargedAttack();
}

// Listen for press and release
chargeAction.pressEvent.registerListener(() => {
  console.log('Started charging');
});

chargeAction.releaseEvent.registerListener(() => {
  console.log('Released charge');
  player.executeCharge(chargeAction.heldDurationSeconds);
});
```

## Axis Actions

### 1D Axis

Single-axis input (horizontal OR vertical):

```ts
const horizontalMove = new Axis1dAction('horizontal', 'gameplay');

// Bind arrow keys for horizontal movement
const horizontalBinding = new KeyboardAxis1dBinding(
  horizontalMove,
  { positive: 'ArrowRight', negative: 'ArrowLeft' },
  'Arrows: Move Horizontal'
);

// Use the value (-1 to 1)
const horizontalSpeed = horizontalMove.value * 100;
position.x += horizontalSpeed * deltaTime;
```

### 2D Axis

Two-axis input (horizontal AND vertical):

```ts
const moveAction = new Axis2dAction('move', 'gameplay');

// Bind WASD
const wasdBinding = new KeyboardAxis2dBinding(
  moveAction,
  { up: 'w', down: 's', left: 'a', right: 'd' },
  'WASD: Move'
);

// Use the vector
const movement = moveAction.value; // Vector2 with x and y from -1 to 1
position.x += movement.x * speed * deltaTime;
position.y += movement.y * speed * deltaTime;
```

## Input Groups

Group related actions and activate/deactivate them together:

```ts
// Create actions with different groups
const moveAction = new Axis2dAction('move', 'gameplay');
const jumpAction = new TriggerAction('jump', 'gameplay');
const pauseAction = new TriggerAction('pause', 'menu');

// Set active group
inputManager.setActiveGroup('gameplay'); // Only gameplay actions work
inputManager.setActiveGroup('menu');     // Only menu actions work
inputManager.setActiveGroup(null);       // All actions work
```

Common use cases:
- Disable gameplay inputs when menu is open
- Different control schemes for different game modes
- Tutorial mode with limited inputs

## Mouse Input

### Mouse Position

```ts
import { MouseInputSource, MousePositionBinding } from '@forge-game-engine/forge';

const mouse = new MouseInputSource(canvas);

// Get mouse position
const mousePos = mouse.mousePosition; // Vector2
console.log(`Mouse: ${mousePos.x}, ${mousePos.y}`);

// Get delta (movement since last frame)
const mouseDelta = mouse.mouseDelta; // Vector2
```

### Mouse Buttons

```ts
// Mouse buttons as trigger actions
const leftClickAction = new TriggerAction('left-click', 'gameplay');
const rightClickAction = new TriggerAction('right-click', 'gameplay');

const leftClickBinding = new MouseTriggerBinding(
  leftClickAction,
  0, // Button index (0=left, 1=middle, 2=right)
  'Left Click'
);

const rightClickBinding = new MouseTriggerBinding(
  rightClickAction,
  2,
  'Right Click'
);

mouse.addTriggerBinding(leftClickBinding);
mouse.addTriggerBinding(rightClickBinding);
```

### Mouse in Systems

```ts
class AimSystem extends System {
  constructor(private mouse: MouseInputSource) {
    super('aim', [PositionComponent.symbol, PlayerComponent.symbol]);
  }
  
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const mousePos = this.mouse.mousePosition;
    
    // Calculate angle to mouse
    const dx = mousePos.x - position.x;
    const dy = mousePos.y - position.y;
    const angle = Math.atan2(dy, dx);
    
    // Update player rotation
    entity.getComponent(RotationComponent).radians = angle;
  }
}
```

## Complete Example

Here's a complete input setup for a top-down game:

```ts
import {
  Game,
  createWorld,
  InputManager,
  TriggerAction,
  HoldAction,
  Axis2dAction,
  KeyboardInputSource,
  MouseInputSource,
  KeyboardTriggerBinding,
  KeyboardHoldBinding,
  KeyboardAxis2dBinding,
  MouseTriggerBinding,
  InputsComponent,
  InputsUpdateSystem
} from '@forge-game-engine/forge';

// Setup game
const game = new Game();
const { world } = createWorld('main', game);

// Create input manager
const inputManager = new InputManager();

// Create actions
const moveAction = new Axis2dAction('move', 'gameplay');
const shootAction = new TriggerAction('shoot', 'gameplay');
const reloadAction = new TriggerAction('reload', 'gameplay');
const sprintAction = new HoldAction('sprint', 'gameplay');

// Register actions
inputManager.addAxis2dActions(moveAction);
inputManager.addTriggerActions(shootAction, reloadAction);
inputManager.addHoldActions(sprintAction);

// Setup keyboard
const keyboard = new KeyboardInputSource();

keyboard.addAxis2dBinding(
  new KeyboardAxis2dBinding(
    moveAction,
    { up: 'w', down: 's', left: 'a', right: 'd' },
    'WASD: Move'
  )
);

keyboard.addTriggerBinding(
  new KeyboardTriggerBinding(reloadAction, 'r', 'R: Reload')
);

keyboard.addHoldBinding(
  new KeyboardHoldBinding(sprintAction, 'Shift', 'Shift: Sprint')
);

// Setup mouse
const mouse = new MouseInputSource(game.canvas);

mouse.addTriggerBinding(
  new MouseTriggerBinding(shootAction, 0, 'Left Click: Shoot')
);

// Register input sources
inputManager.addUpdatable(keyboard);
inputManager.addUpdatable(mouse);

// Add inputs to world via component
const inputsEntity = world.buildAndAddEntity('inputs', [
  new InputsComponent(inputManager)
]);

// Add input update system
world.addSystem(new InputsUpdateSystem());

// Create player movement system
class PlayerMovementSystem extends System {
  constructor() {
    super('player-movement', [
      PositionComponent.symbol,
      PlayerComponent.symbol,
      InputsComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const inputs = entity.getComponent(InputsComponent).inputManager;
    const position = entity.getComponent(PositionComponent);
    
    // Get movement
    const movement = moveAction.value;
    let speed = 150;
    
    // Sprint modifier
    if (sprintAction.isHeld) {
      speed *= 2;
    }
    
    // Apply movement
    position.x += movement.x * speed * this.time.deltaTimeInSeconds;
    position.y += movement.y * speed * this.time.deltaTimeInSeconds;
    
    // Handle shooting
    if (shootAction.isTriggered) {
      this.shoot(entity);
    }
    
    // Handle reload
    if (reloadAction.isTriggered) {
      this.reload(entity);
    }
  }
  
  private shoot(entity: Entity) {
    console.log('Shoot!');
  }
  
  private reload(entity: Entity) {
    console.log('Reload!');
  }
}

world.addSystem(new PlayerMovementSystem());

game.run();
```

## Input Remapping

Allow players to remap controls:

```ts
class InputRemapper {
  constructor(
    private keyboard: KeyboardInputSource,
    private action: TriggerAction
  ) {}
  
  remap(newKey: string) {
    // Remove old bindings
    const oldBindings = this.keyboard
      .getTriggerBindings()
      .filter(b => b.action === this.action);
    
    oldBindings.forEach(b => 
      this.keyboard.removeTriggerBinding(b)
    );
    
    // Add new binding
    const newBinding = new KeyboardTriggerBinding(
      this.action,
      newKey,
      `${newKey}: ${this.action.name}`
    );
    this.keyboard.addTriggerBinding(newBinding);
  }
}

// Usage
const remapper = new InputRemapper(keyboard, jumpAction);
remapper.remap('Space'); // Remap to Space key
```

## Best Practices

- **Use action-based input** - Don't check for specific keys directly in gameplay code
- **Group related actions** - Use input groups to manage context-specific controls
- **Provide visual feedback** - Show when inputs are triggered
- **Allow remapping** - Let players customize controls
- **Handle multiple input sources** - Support keyboard, mouse, gamepad simultaneously
- **Consider accessibility** - Provide alternative input options
- **Use hold duration** - For charged attacks or different power levels
- **Separate concerns** - Keep input handling separate from game logic

## See Also

- [InputManager API](../../api/classes/InputManager.md)
- [TriggerAction API](../../api/classes/TriggerAction.md)
- [HoldAction API](../../api/classes/HoldAction.md)
- [Axis1dAction API](../../api/classes/Axis1dAction.md)
- [Axis2dAction API](../../api/classes/Axis2dAction.md)
- [KeyboardInputSource API](../../api/classes/KeyboardInputSource.md)
- [MouseInputSource API](../../api/classes/MouseInputSource.md)
