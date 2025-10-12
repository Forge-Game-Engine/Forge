---
sidebar_position: 2
---

# Property Animations

Property animations allow you to smoothly interpolate numeric values over time using easing functions.

## Basic Usage

```ts
import { AnimationComponent, AnimationSystem } from '@forge-game-engine/forge';

// Add animation system to world
world.addSystem(new AnimationSystem(world.time));

// Create an animation
const animation = new AnimationComponent({
  duration: 2000, // milliseconds
  startValue: 0,
  endValue: 100,
  updateCallback: (value) => {
    // Update component property
    const position = entity.getComponent(PositionComponent);
    position.x = value;
  }
});

entity.addComponent(animation);
```

## Easing Functions

Control animation timing with built-in easing functions:

```ts
import { easeInOutQuad } from '@forge-game-engine/forge';

const animation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 100,
  easing: easeInOutQuad,
  updateCallback: (value) => {
    // Smooth acceleration and deceleration
  }
});
```

Available easing functions:
- `linear` - Constant speed
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`

## Looping

```ts
// Loop indefinitely
const loopingAnimation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 360,
  loop: 'loop',
  loopCount: -1, // -1 = infinite
  updateCallback: (value) => {
    const rotation = entity.getComponent(RotationComponent);
    rotation.degrees = value;
  }
});

// Ping-pong (forward then backward)
const pingPongAnimation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 100,
  loop: 'pingpong',
  loopCount: 3,
  updateCallback: (value) => {
    const position = entity.getComponent(PositionComponent);
    position.y = value;
  }
});
```

## Multiple Animations

Add multiple animations to one entity:

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

## See Also

- [AnimationComponent API](../../api/classes/AnimationComponent.md)
- [AnimationSystem API](../../api/classes/AnimationSystem.md)
