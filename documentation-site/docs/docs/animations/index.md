---
sidebar_position: 1
---

# Animations

Forge provides a comprehensive animation system that allows you to create smooth, interpolated animations for game properties and sprite-based animations using sprite sheets.

## Animation Types

Forge supports two main types of animations:

1. **Property Animations** - Animate any numeric property over time with easing functions
2. **Sprite Animations** - Play frame-based animations from sprite sheets

## Property Animations

Property animations allow you to smoothly interpolate values over time. These are perfect for animating position, rotation, opacity, and any other numeric properties.

### Basic Usage

```ts
import { AnimationComponent, AnimationSystem } from '@forge-game-engine/forge';

// Create an animation that animates a value from 0 to 100 over 2 seconds
const animation = new AnimationComponent({
  duration: 2000, // milliseconds
  startValue: 0,
  endValue: 100,
  updateCallback: (value) => {
    // This gets called every frame with the interpolated value
    entity.getComponent(PositionComponent).x = value;
  },
  finishedCallback: () => {
    console.log('Animation complete!');
  }
});

// Add to entity
entity.addComponent(animation);

// Add the animation system to your world to make animations play
world.addSystem(new AnimationSystem(world.time));
```

### Easing Functions

Forge includes several built-in easing functions to control animation timing:

```ts
import { 
  linear, 
  easeInQuad, 
  easeOutQuad, 
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic
} from '@forge-game-engine/forge';

const animation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 100,
  easing: easeInOutQuad, // Smooth acceleration and deceleration
  updateCallback: (value) => {
    console.log(value);
  }
});
```

Available easing functions:
- `linear` - Constant speed
- `easeInQuad` - Quadratic acceleration
- `easeOutQuad` - Quadratic deceleration
- `easeInOutQuad` - Quadratic acceleration then deceleration
- `easeInCubic` - Cubic acceleration
- `easeOutCubic` - Cubic deceleration
- `easeInOutCubic` - Cubic acceleration then deceleration

### Looping Animations

Animations can loop in different ways:

```ts
// Loop indefinitely
const loopingAnimation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 360,
  loop: 'loop', // Animation restarts from beginning
  loopCount: -1, // -1 means infinite loops
  updateCallback: (value) => {
    entity.getComponent(RotationComponent).degrees = value;
  }
});

// Ping-pong animation (goes forward then backward)
const pingPongAnimation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 100,
  loop: 'pingpong', // Animation plays forward then backward
  loopCount: 3, // Play 3 full cycles
  updateCallback: (value) => {
    entity.getComponent(PositionComponent).y = value;
  }
});
```

### Multiple Animations

You can add multiple animations to a single entity:

```ts
const animations = new AnimationComponent([
  {
    duration: 1000,
    startValue: 0,
    endValue: 100,
    updateCallback: (value) => {
      entity.getComponent(PositionComponent).x = value;
    }
  },
  {
    duration: 500,
    startValue: 0,
    endValue: 50,
    updateCallback: (value) => {
      entity.getComponent(PositionComponent).y = value;
    }
  }
]);
```

## Sprite Animations

Sprite animations allow you to play frame-based animations from sprite sheets. This is ideal for character animations, effects, and other frame-by-frame animations.

### Creating Sprite Animations

First, create animations using the [`createAnimation`](../../api/functions/createAnimation.md) utility:

```ts
import { 
  createAnimation,
  SpriteAnimationComponent,
  SpriteAnimationSystem,
  AnimationController,
  AnimationTransition,
  AnimationInputs
} from '@forge-game-engine/forge';

// Create an animation from a sprite sheet
// Assuming a sprite sheet with 4 columns and 2 rows (8 frames total)
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

### Animation Transitions

Use [`AnimationController`](../../api/classes/AnimationController.md) to manage transitions between animations:

```ts
// Create animation inputs to control which animation plays
const inputs = new AnimationInputs();
inputs.setInput('isMoving', false);

// Define transitions between animations
const transitions = [
  // From 'entry' state (starting animation)
  new AnimationTransition('entry', idleAnimation, () => true),
  
  // From 'idle' to 'walk' when isMoving becomes true
  new AnimationTransition(
    'idle',
    walkAnimation,
    (inputs) => inputs.getInput('isMoving') === true
  ),
  
  // From 'walk' to 'idle' when isMoving becomes false
  new AnimationTransition(
    'walk',
    idleAnimation,
    (inputs) => inputs.getInput('isMoving') === false
  )
];

const controller = new AnimationController(...transitions);

// Add to entity
const spriteAnimComponent = new SpriteAnimationComponent(
  controller,
  inputs,
  1.0 // playback speed multiplier
);

entity.addComponent(spriteAnimComponent);

// Add the sprite animation system to your world
world.addSystem(new SpriteAnimationSystem(world.time));
```

### Controlling Animations

You can control sprite animations through the animation inputs:

```ts
// In your game logic or input system
const spriteAnim = entity.getComponent(SpriteAnimationComponent);

// Change animation by updating inputs
spriteAnim.animationInputs.setInput('isMoving', true);

// Adjust playback speed
spriteAnim.playbackSpeed = 2.0; // Play twice as fast
spriteAnim.playbackSpeed = 0.5; // Play at half speed
```

### Animation Events

Animations provide events you can listen to:

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

## Complete Example

Here's a complete example combining sprites and animations:

```ts
import {
  Game,
  createWorld,
  Entity,
  PositionComponent,
  SpriteComponent,
  SpriteAnimationComponent,
  SpriteAnimationSystem,
  createAnimation,
  AnimationController,
  AnimationTransition,
  AnimationInputs,
  ImageCache,
  createShaderStore,
  createImageSprite
} from '@forge-game-engine/forge';

const game = new Game();
const { world, renderLayers } = createWorld('main', game);

// Load sprite sheet
const imageCache = new ImageCache();
const spriteSheet = await imageCache.getOrLoad('character-spritesheet.png');

// Create sprite
const shaderStore = createShaderStore();
const sprite = createImageSprite(spriteSheet, renderLayers[0], shaderStore);

// Create animations
const walkAnimation = createAnimation('walk', 1, 8, 0.1);
const idleAnimation = createAnimation('idle', 1, 4, 0.15);

// Set up animation controller
const inputs = new AnimationInputs();
inputs.setInput('isMoving', false);

const controller = new AnimationController(
  new AnimationTransition('entry', idleAnimation, () => true),
  new AnimationTransition('idle', walkAnimation, (i) => i.getInput('isMoving')),
  new AnimationTransition('walk', idleAnimation, (i) => !i.getInput('isMoving'))
);

// Create entity with sprite animation
const character = world.buildAndAddEntity('character', [
  new PositionComponent(100, 100),
  new SpriteComponent(sprite),
  new SpriteAnimationComponent(controller, inputs)
]);

// Add animation system
world.addSystem(new SpriteAnimationSystem(world.time));

game.run();
```

## Best Practices

- Use property animations for smooth value interpolation
- Use sprite animations for frame-based visual effects
- Cache your animation definitions and reuse them across entities
- Choose appropriate easing functions for natural movement
- Use animation events to trigger game logic at key moments
- Keep sprite sheets organized with consistent frame sizes
- Consider performance when using many animated entities

## See Also

- [AnimationComponent API](../../api/classes/AnimationComponent.md)
- [SpriteAnimationComponent API](../../api/classes/SpriteAnimationComponent.md)
- [AnimationController API](../../api/classes/AnimationController.md)
- [createAnimation API](../../api/functions/createAnimation.md)
