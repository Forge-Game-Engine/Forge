---
sidebar_position: 1
---

# Input

Forge provides an action-based input system that handles keyboard, mouse, and other input devices.

## Core Concepts

- **Input Actions** - Abstract game actions (jump, shoot, move)
- **Input Bindings** - Map physical inputs to actions
- **Input Groups** - Organize actions by context (gameplay, menu)
- **Input Sources** - Keyboard, mouse, gamepad devices

## Action Types

```ts
import {
  TriggerAction,  // One-time press
  HoldAction,     // Continuous hold
  Axis1dAction,   // Single axis (-1 to 1)
  Axis2dAction    // Two axes (x, y)
} from '@forge-game-engine/forge';

const jumpAction = new TriggerAction('jump', 'gameplay');
const sprintAction = new HoldAction('sprint', 'gameplay');
const moveHorizontal = new Axis1dAction('move-h', 'gameplay');
const move2d = new Axis2dAction('move', 'gameplay');
```

## Setting Up Input

```ts
import { InputManager, KeyboardInputSource } from '@forge-game-engine/forge';

// Create input manager
const inputManager = new InputManager();

// Register actions
inputManager.addTriggerActions(jumpAction);
inputManager.addHoldActions(sprintAction);
inputManager.addAxis2dActions(move2d);

// Create and bind keyboard input
const keyboard = new KeyboardInputSource();

keyboard.addTriggerBinding(
  new KeyboardTriggerBinding(jumpAction, ' ', 'Space: Jump')
);

keyboard.addAxis2dBinding(
  new KeyboardAxis2dBinding(
    move2d,
    { up: 'w', down: 's', left: 'a', right: 'd' },
    'WASD: Move'
  )
);

// Register input source
inputManager.addUpdatable(keyboard);

// Add to world
world.buildAndAddEntity('inputs', [
  new InputsComponent(inputManager)
]);

world.addSystem(new InputsUpdateSystem());
```

## Using Inputs in Systems

```ts
class PlayerMovementSystem extends System {
  constructor(
    private moveAction: Axis2dAction,
    private sprintAction: HoldAction
  ) {
    super('player-movement', [PositionComponent.symbol]);
  }
  
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const movement = this.moveAction.value; // Vector2
    
    let speed = 100;
    if (this.sprintAction.isHeld) {
      speed *= 2;
    }
    
    position.x += movement.x * speed * this.time.deltaTimeInSeconds;
    position.y += movement.y * speed * this.time.deltaTimeInSeconds;
  }
}
```

## Input Groups

Control which actions are active:

```ts
// Actions with different groups
const moveAction = new Axis2dAction('move', 'gameplay');
const pauseAction = new TriggerAction('pause', 'menu');

// Activate only gameplay actions
inputManager.setActiveGroup('gameplay');

// Activate only menu actions
inputManager.setActiveGroup('menu');

// Activate all actions
inputManager.setActiveGroup(null);
```

## Mouse Input

```ts
import { MouseInputSource } from '@forge-game-engine/forge';

const mouse = new MouseInputSource(canvas);

// Get position
const mousePos = mouse.mousePosition; // Vector2

// Get delta (movement since last frame)
const mouseDelta = mouse.mouseDelta; // Vector2

// Bind mouse buttons
const leftClick = new TriggerAction('left-click', 'gameplay');
mouse.addTriggerBinding(
  new MouseTriggerBinding(leftClick, 0, 'Left Click')
);
```

## See Also

- [InputManager API](../../api/classes/InputManager.md)
- [TriggerAction API](../../api/classes/TriggerAction.md)
- [HoldAction API](../../api/classes/HoldAction.md)
- [Axis1dAction API](../../api/classes/Axis1dAction.md)
- [Axis2dAction API](../../api/classes/Axis2dAction.md)
- [KeyboardInputSource API](../../api/classes/KeyboardInputSource.md)
- [MouseInputSource API](../../api/classes/MouseInputSource.md)
