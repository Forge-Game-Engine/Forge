---
sidebar_position: 1
---

# Time

[`Time`](/Forge/docs/api/classes/Time) holds the timing of the current
frame: the time since the previous frame (delta time), the total elapsed
time, the frame count and the frame rate. Its `timeScale` multiplies the
delta time, for slow motion or pausing. It also hands out fixed steps, for
work that runs at a fixed rate.

## Creating and updating time

[`createGame`](/Forge/docs/api/functions/createGame) creates a `Time` and
returns it, and its [`Game`](/Forge/docs/api/classes/Game) calls
`time.update(performance.now())` at the start of every frame, before it
updates its worlds (see [Game](../ecs/game.md)):

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { game, world, time } = createGame('game');
```

Without a `Game`, create a `Time` and call `update` with the current time in
milliseconds before each `world.update()`:

```ts
import { Time } from '@forge-game-engine/forge/common';

const time = new Time();

time.update(performance.now());
world.update();
```

## Using delta time in a system

A system that receives the `Time` in its factory reads it on each update.
Multiplying a per-second rate by `deltaTimeInSeconds` makes a change happen
at the same speed whatever the frame rate:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';

const unitsPerSecond = 10;

const createDriftEcsSystem = (
  time: Time,
): EcsSystem<[PositionEcsComponent]> => ({
  query: [positionId],
  update: (_world, { components: [positions] }) => {
    for (const position of positions) {
      position.local.x += unitsPerSecond * time.deltaTimeInSeconds;
    }
  },
});

world.addSystem(createDriftEcsSystem(time));
```

`deltaTimeInMilliseconds` holds the same value in milliseconds.

:::note
The delta time is limited to the range `0` to `1/15` of a second, so a frame
that takes longer (for example, after the browser tab was in the background)
moves things by at most `1/15` of a second. `rawDeltaTimeInSeconds` and
`rawDeltaTimeInMilliseconds` hold the unlimited, unscaled delta time.
:::

## Reading elapsed time and frame count

`timeInSeconds` and `timeInMilliseconds` are the sum of every frame's delta
time, so they follow `timeScale` and the delta time limit. `rawTimeInSeconds`
and `rawTimeInMilliseconds` are the timestamp passed to the latest `update`.
`frames` is the number of times `update` has been called.

## Scaling time

Set `timeScale` to change how fast time passes for everything that reads the
delta time. `1` is normal speed, values below `1` slow time down, and `0`
pauses it:

```ts
time.timeScale = 0.5; // half speed
time.timeScale = 0; // paused
```

At `timeScale = 0`, `deltaTimeInSeconds` is `0`. Systems still run each
frame; anything they change by the delta time doesn't change. The raw
values aren't scaled.

## Fixed timestep

A fixed timestep runs work, such as a physics simulation, in steps of the same
size whatever the frame rate. `Time` keeps a fixed clock beside the frame
clock: each `update` adds the frame's delta time to an accumulated time, and
[`consumeFixedStep`](/Forge/docs/api/classes/Time#consumefixedstep) takes one
fixed step out of it.

### Running fixed steps

Call `consumeFixedStep` in a loop after `time.update`, and run the fixed-rate
work once per step:

```ts
time.update(performance.now());

while (time.consumeFixedStep()) {
  runFixedStep();
}

world.update();
```

When the accumulated time holds at least one fixed delta time,
`consumeFixedStep` subtracts it, starts a fixed step and returns `true`.
Otherwise it ends the fixed step and returns `false`, and the rest of the
accumulated time is kept for the next frame. A frame shorter than the fixed
delta time can take no steps, and a longer one takes several.

While a fixed step runs, `isInFixedStep` is `true`, `deltaTimeInSeconds` and
`deltaTimeInMilliseconds` are the fixed delta time, and `timeInSeconds` and
`timeInMilliseconds` are the fixed time: the time at the end of the step. A
system written against `deltaTimeInSeconds` runs at the fixed rate when it's
updated inside the loop. The raw values, `frames`, `fps` and `timeScale` don't
change.

Run the loop once per frame, in the code that calls `time.update`, not inside
a system: each step it takes is removed from the accumulated time.
[`Game`](/Forge/docs/api/classes/Game) doesn't call `consumeFixedStep`.

:::caution
`update` throws while a fixed step is running. Call `consumeFixedStep` until
it returns `false` before the next `update`.
:::

### Setting the fixed delta time

`fixedDeltaTimeInMilliseconds` is the size of each step, `1000 / 60` (60 steps
per second) by default. `fixedDeltaTimeInSeconds` holds the same value in
seconds:

```ts
time.fixedDeltaTimeInMilliseconds = 1000 / 50; // 50 steps per second
```

The accumulated time is kept, and the next step uses the new size. Setting a
value that isn't finite and greater than `0` throws.

### Scaling fixed steps

The accumulated time is fed the frame's `deltaTimeInMilliseconds`, which is
scaled by `timeScale` and limited to `1/15` of a second. At
`timeScale = 0.5`, fixed steps happen half as often; at `timeScale = 0`, no
fixed steps happen. The size of a step doesn't change. The first `update`
adds nothing, since its delta time isn't elapsed time.

### Interpolating between fixed steps

After the loop, `fixedOverstepFraction` is the accumulated time left over, as
a fraction of the fixed delta time, from `0` up to but not including `1`. To
draw a value that changes in fixed steps smoothly, interpolate between its
values at the previous and the latest fixed step by this fraction.

## Measuring the frame rate

`fps` is the number of `update` calls whose timestamp is within the last
second:

```ts
const framesPerSecond = time.fps;
```
