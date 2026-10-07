---
sidebar_position: 1
---

# Time

[`Time`](/Forge/docs/api/classes/Time) holds the timing of the current
frame: the time since the previous frame (delta time), the total elapsed
time, the frame count and the frame rate. Its `timeScale` multiplies the
delta time, for slow motion or pausing.

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

## Measuring the frame rate

`fps` is the number of `update` calls whose timestamp is within the last
second:

```ts
const framesPerSecond = time.fps;
```
