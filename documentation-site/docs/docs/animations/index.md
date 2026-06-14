# Animations

An animation is a value (or set of values) that changes over time according
to a timing function, easing curve, and optional looping rules. Forge
provides two ECS-integrated animation systems:

- [`createAnimationEcsSystem`](/Forge/docs/api/functions/createAnimationEcsSystem):
  interpolates numeric values, such as position, scale, or opacity, with
  easing and looping.
- [`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem):
  advances a [`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
  through the frames of an [`AnimationClip`](/Forge/docs/api/classes/AnimationClip)
  sliced from a sprite sheet.

Guides in this section:

- [Sprite Animations](./sprite-animations.md): slicing sprite sheets into
  animation clips and playing them on an entity.
- [Property Animations](./property-animations.md): interpolating numeric
  values with easing, looping, and ping-pong.
