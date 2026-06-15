---
sidebar_position: 3
---

# Interpolation and Smoothing

These functions cover the numeric glue between values: blending between two
numbers, keeping a value in range, easing a position toward a target over
time, and squaring a value while keeping its sign.

## lerp: blending between two values

[`lerp(v0, v1, t)`](/Forge/docs/api/functions/lerp) returns `v0 + t * (v1 - v0)`.
At `t = 0` you get `v0`, at `t = 1` you get `v1`, and anything in between is a
blend. It works for any numeric quantity: positions, colors, opacity, scale.

:::caution
`t` is **not clamped**. Values outside `[0, 1]` extrapolate past `v0` or
`v1`, which is useful for deliberate overshoot effects, but means a `t`
computed as `elapsed / duration` will keep extrapolating past `v1` once
`elapsed > duration`. If you need the result to stop at the endpoints, clamp
`t` yourself:

```ts
const t = clamp(elapsed / duration, 0, 1);
const value = lerp(start, end, t);
```
:::

## clamp: keeping a value in range

[`clamp(value, min, max)`](/Forge/docs/api/functions/clamp) restricts
`value` to `[min, max]`. It shows up in two different shapes in the engine:

- **Normalizing constructor input once**: `RigidBody` clamps `restitution`
  and `friction` to `[0, 1]` in its constructor, so invalid values are
  caught early and the rest of the engine can trust they're always in range,
  rather than re-clamping on every read.
- **Clamping a value that changes every frame**: the camera system clamps
  `zoom` between `minZoom` and `maxZoom` every time zoom input is applied,
  since the valid range doesn't change but the value does.

Pick whichever matches your case, clamp once at the boundary if the value is
fixed after construction, or every update if it's driven by continuous
input.

## smoothDampVector2: easing toward a target

[`smoothDampVector2`](/Forge/docs/api/functions/smoothDampVector2) moves a
position toward a target using a critically damped spring. Unlike `lerp`, it has momentum:
it accelerates and decelerates smoothly and won't overshoot the target, which
makes it well suited for camera follow and UI elements easing toward a new
position.

It's a pure function: it does not mutate `position` or `velocity`, it
returns new `positionOutput` and `velocityOutput` values. The
`velocityOutput` carries the current rate of change, so you must store it
and pass it back in as `velocity` on the next call:

```ts
import { smoothDampVector2 } from '@forge-game-engine/forge/math';

const cameraFollowSystem = {
  query: [cameraId, positionId] as const,
  run(result, _world, _before) {
    const [camera, position] = result.components;

    const { positionOutput, velocityOutput } = smoothDampVector2(
      camera.position,
      position.world,
      camera.velocity,
      camera.maxFollowSpeed,
      camera.followSmoothTime,
      deltaTimeInSeconds,
    );

    camera.position = positionOutput;
    camera.velocity = velocityOutput;
  },
};
```

:::caution
If `velocityOutput` is discarded instead of stored (for example, by passing
`Vector2.zero` as `velocity` on every call instead of the previous
`velocityOutput`), the spring never builds momentum. The camera will still
move toward the target, but at a constant slow rate near `maxSpeed`, missing
the acceleration/deceleration that makes the smoothing feel natural.
:::

`smoothTime` is the approximate time to reach the target, smaller values
follow more tightly (less lag, more responsive), larger values feel looser
and more cinematic. `maxSpeed` caps how fast the position can change
regardless of how far away the target is, preventing a huge initial jump if
the target teleports.

## signedSquare: squaring without losing direction

[`signedSquare(x)`](/Forge/docs/api/functions/signedSquare) returns
`x * Math.abs(x)`, the square of `x` with the original sign preserved
(`signedSquare(-3)` is `-9`, not `9`). Plain `x * x` always returns a
positive number, which loses the sign of `x`.

This is the shape you want for drag or resistance forces that scale with the
square of speed but must oppose the current direction of motion, whichever
way that is:

```ts
const dragForce = -signedSquare(velocity.x) * dragCoefficient;
```

Squaring `velocity.x` directly here would make the drag force always
negative, accelerating a body moving in the negative direction instead of
slowing it down.
