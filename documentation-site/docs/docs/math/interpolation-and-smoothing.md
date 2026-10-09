---
sidebar_position: 4
---

# Interpolation and Smoothing

The math module has four functions for moving a number or vector between
values: `lerp` blends two numbers, `clamp` keeps a number in a range,
`smoothDampVector2` moves a position toward a target over time, and
`signedSquare` squares a number and keeps its sign.

## Blending two values

[`lerp(v0, v1, t)`](/Forge/docs/api/functions/lerp) returns
`v0 + t * (v1 - v0)`: `v0` when `t` is `0`, `v1` when `t` is `1`, and the
values between them for a `t` between `0` and `1`.

```ts
import { clamp, lerp } from '@forge-game-engine/forge/math';

const t = clamp(elapsedSeconds / durationSeconds, 0, 1);
const opacity = lerp(0, 1, t);
```

:::caution
`lerp` doesn't clamp `t`. A `t` greater than `1` returns a value past `v1`,
so clamp `t` when it's computed from a time that keeps increasing, as above.
:::

## Keeping a value in a range

[`clamp(value, min, max)`](/Forge/docs/api/functions/clamp) returns `min`
when `value` is less than `min`, `max` when it's greater than `max`, and
`value` otherwise:

```ts
const zoom = clamp(requestedZoom, 0.5, 4);
```

## Moving toward a target over time

[`smoothDampVector2`](/Forge/docs/api/functions/smoothDampVector2) moves a
position toward a target as a critically damped spring: it speeds up, then
slows down as it reaches the target, and doesn't move past it. Call it once
per frame. It doesn't change its arguments; it returns a new position
(`positionOutput`) and a new velocity (`velocityOutput`). Store the velocity
and pass it back as `velocity` on the next call:

```ts
import { smoothDampVector2 } from '@forge-game-engine/forge/math';

const { positionOutput, velocityOutput } = smoothDampVector2(
  follower.position,
  target,
  follower.velocity,
  maxSpeed,
  smoothTimeInSeconds,
  time.deltaTimeInSeconds,
);

follower.position = positionOutput;
follower.velocity = velocityOutput;
```

`smoothTime` is the approximate time in seconds the position takes to reach
the target. `maxSpeed` limits how fast the position moves.

:::caution
Passing a zero velocity on every call instead of the previous
`velocityOutput` resets the spring each frame, and the position doesn't
speed up or slow down.
:::

## Squaring a value with its sign

[`signedSquare(x)`](/Forge/docs/api/functions/signedSquare) returns
`x * Math.abs(x)`: the square of `x` with the sign of `x`, so
`signedSquare(-3)` is `-9`. Use it for a value that grows with the square of
another but keeps its direction, such as drag opposing a velocity:

```ts
import { signedSquare } from '@forge-game-engine/forge/math';

const drag = -signedSquare(velocity.x) * dragCoefficient;
```
