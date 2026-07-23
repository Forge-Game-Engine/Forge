# Timers

The timer module lets an entity schedule callbacks to run after a delay,
optionally repeating on an interval. It is built on
[`TimerEcsComponent`](/Forge/docs/api/interfaces/TimerEcsComponent) and
[`createTimerEcsSystem`](/Forge/docs/api/functions/createTimerEcsSystem), and
advances using the same [`Time`](/Forge/docs/api/classes/Time) instance as the
rest of your game, so timers automatically respect pausing and slow motion.

## Quick Start

Add a `TimerEcsComponent` to an entity with one or more
[`TimerTask`](/Forge/docs/api/interfaces/TimerTask) entries, then register
`createTimerEcsSystem`:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import {
  addTimerComponent,
  createTimerEcsSystem,
  TimerId,
} from '@forge-game-engine/forge/timer';

const { world, time } = createGame('game-container');

const spawner = world.createEntity();

addTimerComponent(world, spawner, {
  tasks: [
    {
      callback: () => spawnEnemy(),
      delay: 2_000, // milliseconds
      elapsed: 0,
    },
  ],
});

world.addSystem(createTimerEcsSystem(time));
```

Each `world.update()`, `createTimerEcsSystem` adds
`time.deltaTimeInMilliseconds` to every task's `elapsed`. Once
`elapsed >= delay`, it calls `task.callback()` and either removes the task
(one-shot) or re-arms it (repeating).

## One-shot vs. repeating timers

By default a task is one-shot: it fires once and is then removed from
`tasks`. Use a one-shot timer for things like "spawn the boss after 2
seconds" or "end the round after 30 seconds".

Set `repeat: true` with an `interval` to make a task fire repeatedly. `delay`
is the wait before the _first_ run; every run after that is spaced by
`interval` instead:

```ts
addTimerComponent(world, spawner, {
  tasks: [
    {
      callback: () => spawnWave(),
      delay: 1_000, // first wave after 1s
      elapsed: 0,
      repeat: true,
      interval: 5_000, // every 5s after that
      runsSoFar: 0,
    },
  ],
});
```

:::caution
`repeat: true` only takes effect when `interval` is also set. A task with
`repeat: true` but no `interval` runs once and is removed, like a one-shot
task.
:::

### Limiting repeats with `maxRuns`

Add `maxRuns` to stop a repeating task after a fixed number of executions,
for example a damage-over-time effect that ticks three times before expiring:

```ts
{
  callback: () => applyPoisonTick(),
  delay: 500,
  elapsed: 0,
  repeat: true,
  interval: 500,
  maxRuns: 3,
  runsSoFar: 0,
}
```

:::caution
Always include `runsSoFar: 0` on a repeating task, even though it is an
optional field on [`TimerTask`](/Forge/docs/api/interfaces/TimerTask). The
system increments `runsSoFar` directly each run; if it starts as
`undefined`, that increment produces `NaN`, and `NaN >= maxRuns` is always
`false`. Without `runsSoFar: 0`, a `maxRuns` task never stops repeating.
:::

## Timers and `timeScale`

Because `createTimerEcsSystem` advances tasks using
`time.deltaTimeInMilliseconds`, every timer is affected by
[`time.timeScale`](/Forge/docs/api/classes/Time#timescale). Setting
`timeScale` to `0` to pause your game pauses every timer too, and slow motion
slows timers down by the same factor. See [Time](../common/time.md) for more
on `timeScale`.

## Adding and removing tasks at runtime

`tasks` is a plain array on the component, so you can push or splice tasks at
any time, for example in response to a gameplay event:

```ts
const timer = world.getComponent(spawner, TimerId);

timer?.tasks.push({
  callback: () => triggerExplosion(),
  delay: 3_000,
  elapsed: 0,
});
```

A task added this frame is not evaluated until the next `world.update()`, so
even a `delay` of `0` will not fire until the following frame.

## Performance notes

`createTimerEcsSystem` returns early for any entity whose `tasks` array is
empty, so giving an entity a `TimerEcsComponent` "just in case" costs nothing
until a task is added. When tasks are present, the system walks them
back-to-front each frame so it can `splice` out completed one-shot tasks (and
repeating tasks that hit `maxRuns`) in place, without skipping or re-visiting
entries.
