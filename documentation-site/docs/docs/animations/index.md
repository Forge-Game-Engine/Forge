---
sidebar_position: 1
---

# Animations

Forge provides an animation system for smooth value interpolation and sprite sheet animations.

## Animation Types

Forge supports two types of animations:

- **[Property Animations](./property-animations.md)** - Animate numeric values over time with easing functions
- **[Sprite Animations](./sprite-animations.md)** - Play frame-based animations from sprite sheets

## Components and Systems

### Property Animations
- [`AnimationComponent`](../../api/classes/AnimationComponent.md) - Stores animation data
- [`AnimationSystem`](../../api/classes/AnimationSystem.md) - Updates animations each frame

### Sprite Animations
- [`SpriteAnimationComponent`](../../api/classes/SpriteAnimationComponent.md) - Stores sprite animation state
- [`SpriteAnimationSystem`](../../api/classes/SpriteAnimationSystem.md) - Updates sprite frames
- [`AnimationController`](../../api/classes/AnimationController.md) - Manages animation transitions
- [`createAnimation`](../../api/functions/createAnimation.md) - Creates animations from sprite sheets

## Usage

Property animations interpolate values using callbacks:

```ts
const animation = new AnimationComponent({
  duration: 1000,
  startValue: 0,
  endValue: 100,
  updateCallback: (value) => {
    entity.getComponent(PositionComponent).x = value;
  }
});
```

Sprite animations play frames from sprite sheets:

```ts
const walkAnimation = createAnimation('walk', 2, 4, 0.1);
const controller = new AnimationController(/* transitions */);
const spriteAnim = new SpriteAnimationComponent(controller, inputs);
```

See the individual pages for detailed examples and best practices.
