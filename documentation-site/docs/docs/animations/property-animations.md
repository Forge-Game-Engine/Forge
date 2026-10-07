---
sidebar_position: 2
---

# Property Animations

A property animation moves a number from a start value to an end value over
a duration and passes the current value to a callback on every update. The
callback writes the value wherever it's needed, such as a position, a scale
or an opacity.

## Animated properties

An [`AnimatedProperty`](/Forge/docs/api/interfaces/AnimatedProperty) has:

- `startValue` and `endValue`: the values the animation moves between.
- `duration`: the length of one iteration, in milliseconds.
- `easing`: a function that maps the elapsed fraction of `duration` (`0` to
  `1`) to the fraction of the way from `startValue` to `endValue`.
- `updateCallback`: called with the current value.
- `loop`, `loopCount` and `finishedCallback`: what happens when the
  animation reaches `endValue`.

An entity's [`AnimationEcsComponent`](/Forge/docs/api/interfaces/AnimationEcsComponent)
holds its running animated properties in `animations`. On every update,
[`createAnimationEcsSystem`](/Forge/docs/api/functions/createAnimationEcsSystem)
adds `time.deltaTimeInMilliseconds` to each one's `elapsed` and calls its
`updateCallback` with `startValue + (endValue - startValue) * easing(elapsed / duration)`.
Because it advances by the [Time](../common/time.md)'s delta time,
animations follow its `timeScale`.

## Adding an animation

[`createAnimatedProperty`](/Forge/docs/api/functions/createAnimatedProperty)
fills in the defaults for the fields you leave out. Add the result to an
`AnimationEcsComponent` with
[`addAnimationComponent`](/Forge/docs/api/functions/addAnimationComponent),
and register the animation system:

```ts
import {
  addAnimationComponent,
  createAnimatedProperty,
  createAnimationEcsSystem,
} from '@forge-game-engine/forge/animations';
import { addPositionComponent } from '@forge-game-engine/forge/common';

const entity = world.createEntity();
const position = addPositionComponent(world, entity);

addAnimationComponent(world, entity, {
  animations: [
    createAnimatedProperty({
      startValue: 0,
      endValue: 100,
      duration: 400,
      updateCallback: (x) => {
        position.local.x = x;
      },
    }),
  ],
});

world.addSystem(createAnimationEcsSystem(time));
```

## Starting an animation on an existing entity

`animations` is an array, so push a new animated property onto it:

```ts
import {
  animationId,
  createAnimatedProperty,
} from '@forge-game-engine/forge/animations';

const animation = world.getComponentRequired(entity, animationId);

animation.animations.push(
  createAnimatedProperty({
    startValue: 1,
    endValue: 2,
    duration: 200,
    updateCallback: (value) => {
      scale.local.x = value;
      scale.local.y = value;
    },
  }),
);
```

## Easing

`easing` defaults to [`linear`](/Forge/docs/api/functions/linear). The
module also has [`easeInOutSine`](/Forge/docs/api/functions/easeInOutSine),
[`easeInOutQuint`](/Forge/docs/api/functions/easeInOutQuint),
[`easeInBack`](/Forge/docs/api/functions/easeInBack),
[`easeInOutBack`](/Forge/docs/api/functions/easeInOutBack) and
[`easeInOutElastic`](/Forge/docs/api/functions/easeInOutElastic). Any
function from a number to a number can be used:

```ts
import {
  createAnimatedProperty,
  easeInOutSine,
} from '@forge-game-engine/forge/animations';

createAnimatedProperty({
  duration: 400,
  easing: easeInOutSine,
  updateCallback: (value) => {
    /* ... */
  },
});
```

:::caution
The back and elastic functions return values below `0` or above `1` partway
through, so `updateCallback` receives values outside the range from
`startValue` to `endValue`. Use another easing function for a value that
must stay in that range, such as an opacity.
:::

## Looping an animation

Set `loop` to repeat the animation when it reaches `endValue`:

- `'loop'` restarts it from `startValue`.
- `'pingpong'` swaps `startValue` and `endValue` on the animated property,
  so the next iteration plays in reverse.

`loopCount` is the number of times it plays again after the first
iteration. It defaults to `-1`, which loops until the animation is removed.

```ts
createAnimatedProperty({
  startValue: 0,
  endValue: 10,
  duration: 500,
  loop: 'pingpong',
  loopCount: 3,
  updateCallback: (y) => {
    position.local.y = y;
  },
});
```

## Reacting to the end of an animation

When an animation completes and doesn't loop again, the animation system
calls its `finishedCallback` and removes it from `animations`:

```ts
createAnimatedProperty({
  duration: 200,
  updateCallback: (value) => {
    /* ... */
  },
  finishedCallback: () => {
    world.removeEntity(entity);
  },
});
```

:::caution
On the update that completes an iteration, `updateCallback` is called a
second time with exactly `endValue`, and, when the animation loops, a third
time with the next iteration's `startValue`. Put work that must happen once,
such as playing a sound, in `finishedCallback`.
:::

## Stopping an animation

Remove the animated property from `animations` to stop it. Its
`finishedCallback` isn't called:

```ts
const index = animation.animations.indexOf(animatedProperty);

if (index !== -1) {
  animation.animations.splice(index, 1);
}
```

Removing the `AnimationEcsComponent` stops all of the entity's animations.
