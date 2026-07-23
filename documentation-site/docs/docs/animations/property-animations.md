---
sidebar_position: 2
---

# Property Animations

Property animations interpolate a single number over time and report
progress through a callback every tick. Use them for anything you can
express as a number: position, scale, rotation, opacity, a health bar's
fill amount, and so on.

## Adding an animated property

Animated properties live in the `animations` array of the
[`animation`](/Forge/docs/api/variables/animationId) component
([`AnimationEcsComponent`](/Forge/docs/api/interfaces/AnimationEcsComponent)).
Build each entry with
[`createAnimatedProperty`](/Forge/docs/api/functions/createAnimatedProperty),
which fills in defaults
([`animationDefaults`](/Forge/docs/api/variables/animationDefaults)) for any
[`AnimatedProperty`](/Forge/docs/api/interfaces/AnimatedProperty) field you
don't specify, then register
[`createAnimationEcsSystem`](/Forge/docs/api/functions/createAnimationEcsSystem)
to advance them every tick:

```ts
import { addPositionComponent, positionId } from '@forge-game-engine/forge/common';
import {
  addAnimationComponent,
  animationId,
  createAnimatedProperty,
  createAnimationEcsSystem,
  easeInOutSine,
} from '@forge-game-engine/forge/animations';

const entity = world.createEntity();

addPositionComponent(world, entity);

addAnimationComponent(world, entity, {
  animations: [
    createAnimatedProperty({
      startValue: 0,
      endValue: 100,
      duration: 400,
      easing: easeInOutSine,
      updateCallback: (x) => {
        const position = world.getComponent(entity, positionId);

        if (position) {
          position.local.x = x;
        }
      },
    }),
  ],
});

world.addSystem(createAnimationEcsSystem(time));
```

Every `world.update()`, the system adds `deltaTimeInMilliseconds` to each
animation's `elapsed`, runs `elapsed / duration` through `easing`, and calls
`updateCallback` with the result mapped between `startValue` and `endValue`.
When `elapsed >= duration`, `updateCallback` is called once more with the
exact `endValue` so the animation always lands precisely on target, then
`finishedCallback` runs and the entry is removed from `animations` (unless
it's looping, see below).

## Triggering animations at runtime

`animations` is a plain array, so you can push new entries onto it whenever
something happens in your game, for example fading out a sprite when an
entity is defeated:

```ts
import { Color, spriteId } from '@forge-game-engine/forge/rendering';

const animationComponent = world.getComponent(entity, animationId);

animationComponent?.animations.push(
  createAnimatedProperty({
    startValue: 1,
    endValue: 0,
    duration: 200,
    updateCallback: (alpha) => {
      const sprite = world.getComponent(entity, spriteId);

      if (sprite) {
        sprite.tintColor = new Color(1, 1, 1, alpha);
      }
    },
    finishedCallback: () => world.removeEntity(entity),
  }),
);
```

## Easing

Pick an easing function that matches the motion you want:
[`linear`](/Forge/docs/api/functions/linear),
[`easeInOutSine`](/Forge/docs/api/functions/easeInOutSine),
[`easeInOutQuint`](/Forge/docs/api/functions/easeInOutQuint),
[`easeInBack`](/Forge/docs/api/functions/easeInBack),
[`easeInOutBack`](/Forge/docs/api/functions/easeInOutBack), and
[`easeInOutElastic`](/Forge/docs/api/functions/easeInOutElastic).

:::tip
The "back" and "elastic" easing functions overshoot, producing values below 0
or above 1 partway through the animation (a wind-up or bounce). If
`updateCallback` can't handle values outside `[startValue, endValue]`
(for example, clamped properties like alpha), pick a non-overshooting easing
function such as `easeInOutSine` or `easeInOutQuint` instead.
:::

## Looping and ping-pong

Set `loop` to `'loop'` or `'pingpong'` (the default is `'none'`) to repeat
the animation, and `loopCount` to control how many times (`-1`, the default,
loops forever):

- `'loop'` resets `elapsed` to `0` and jumps back to `startValue`, then plays
  forward to `endValue` again.
- `'pingpong'` resets `elapsed` to `0` and swaps `startValue` and `endValue`,
  so the next iteration plays in reverse. Each iteration swaps them again,
  producing a back-and-forth motion.

Each iteration after the first decrements `loopCount` (if it's `0` or
greater). Once `loopCount` reaches `0`, the animation is removed and
`finishedCallback` runs.

:::caution
With `'pingpong'`, `startValue` and `endValue` are swapped in place on the
`AnimatedProperty` object every iteration. Don't rely on either field holding
its original value after the first loop; keep a separate copy of the
original bounds if you need them.
:::

## Notes and troubleshooting

- A `duration` of `0` (or any value `elapsed` already exceeds) completes the
  animation on its very first tick: `updateCallback` runs with `endValue`
  immediately and `finishedCallback` fires right away.
- `updateCallback` can run twice in the tick where an animation finishes,
  once with the eased value and once with the exact `endValue`. If your
  callback has side effects beyond setting a value (playing a sound,
  incrementing a counter), guard against double-firing or move that logic
  into `finishedCallback`.
- `finishedCallback` only runs when the animation is fully removed. For
  looping animations, that's after `loopCount` reaches `0`, not after every
  individual iteration.
