# Animations

The animations module changes values over time. It has two kinds of
animation, each with its own component and system:

- [Sprite animations](./sprite-animations.md): a
  [`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
  plays an [`AnimationClip`](/Forge/docs/api/classes/AnimationClip), a
  sequence of frames that are regions of one texture atlas, on an entity's
  sprite.
  [`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem)
  changes the sprite's frame and texture.
- [Property animations](./property-animations.md): an
  [`AnimationEcsComponent`](/Forge/docs/api/interfaces/AnimationEcsComponent)
  holds animated properties, each moving a number from a start value to an
  end value over a duration along an easing curve.
  [`createAnimationEcsSystem`](/Forge/docs/api/functions/createAnimationEcsSystem)
  advances them and passes each new value to a callback.

Everything is imported from `@forge-game-engine/forge/animations`.
