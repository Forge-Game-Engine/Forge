---
sidebar_position: 3
---

# Sprite Animations

Sprite animations play frame-based animations from sprite sheets for characters, effects, and visual elements.

## Creating Animations

Use [`createAnimation`](../../api/functions/createAnimation.md) to define animations from sprite sheets:

```ts
import { createAnimation } from '@forge-game-engine/forge';

// Animation from a 4x2 sprite sheet (8 frames)
const walkAnimation = createAnimation(
  'walk',
  2, // rows
  4, // columns
  0.1 // duration per frame in seconds
);

const idleAnimation = createAnimation(
  'idle',
  1, // rows
  4, // columns
  0.15
);
```

## Animation Controller

Use [`AnimationController`](../../api/classes/AnimationController.md) to manage transitions:

```ts
import {
  AnimationController,
  AnimationTransition,
  AnimationInputs
} from '@forge-game-engine/forge';

// Create inputs to control animations
const inputs = new AnimationInputs();
inputs.setInput('isMoving', false);

// Define transitions
const controller = new AnimationController(
  new AnimationTransition('entry', idleAnimation, () => true),
  new AnimationTransition('idle', walkAnimation, (i) => i.getInput('isMoving')),
  new AnimationTransition('walk', idleAnimation, (i) => !i.getInput('isMoving'))
);
```

## Adding to Entities

```ts
import {
  SpriteAnimationComponent,
  SpriteAnimationSystem
} from '@forge-game-engine/forge';

// Add system to world
world.addSystem(new SpriteAnimationSystem(world.time));

// Add component to entity
const spriteAnim = new SpriteAnimationComponent(
  controller,
  inputs,
  1.0 // playback speed multiplier
);

entity.addComponent(spriteAnim);
```

## Controlling Animations

Update inputs to change animations:

```ts
// In a system
class PlayerMovementSystem extends System {
  constructor() {
    super('player-movement', [
      SpriteAnimationComponent.symbol,
      VelocityComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const spriteAnim = entity.getComponent(SpriteAnimationComponent);
    const velocity = entity.getComponent(VelocityComponent);
    
    // Update animation based on velocity
    const isMoving = velocity.x !== 0 || velocity.y !== 0;
    spriteAnim.animationInputs.setInput('isMoving', isMoving);
  }
}
```

## Animation Events

Listen to animation events:

```ts
walkAnimation.onAnimationStartEvent.registerListener((entity) => {
  console.log('Walk animation started');
});

walkAnimation.onAnimationEndEvent.registerListener((entity) => {
  console.log('Walk animation ended');
});

walkAnimation.onAnimationFrameChangeEvent.registerListener(({ entity, animationFrame }) => {
  console.log('Frame changed:', animationFrame);
});
```

## See Also

- [SpriteAnimationComponent API](../../api/classes/SpriteAnimationComponent.md)
- [SpriteAnimationSystem API](../../api/classes/SpriteAnimationSystem.md)
- [AnimationController API](../../api/classes/AnimationController.md)
- [createAnimation API](../../api/functions/createAnimation.md)
