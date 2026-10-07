# Timers

A timer runs callbacks after a delay, once or repeatedly. An entity's
[`TimerEcsComponent`](/Forge/docs/api/interfaces/TimerEcsComponent) holds a
list of [`TimerTask`](/Forge/docs/api/interfaces/TimerTask)s, and
[`createTimerEcsSystem`](/Forge/docs/api/functions/createTimerEcsSystem)
advances them and runs their callbacks.

## Timer tasks

A task has a `callback`, a `delay` in milliseconds and an `elapsed` time in
milliseconds. On every update, the timer system adds
`time.deltaTimeInMilliseconds` to each task's `elapsed`. When `elapsed`
reaches `delay`, it calls `callback`.

- A one-shot task runs once and is removed from `tasks`.
- A repeating task (`repeat: true` with an `interval`) runs after `delay`,
  then every `interval` milliseconds.

Timers advance by the [Time](../common/time.md)'s delta time, so they follow
its `timeScale`: they slow down with it and stop while it's `0`.

## Adding a timer

Add a `TimerEcsComponent` with its tasks, and register the timer system with
the game's `Time`:

```ts
import {
  addTimerComponent,
  createTimerEcsSystem,
} from '@forge-game-engine/forge/timer';

const entity = world.createEntity();

addTimerComponent(world, entity, {
  tasks: [
    {
      callback: () => console.log('2 seconds passed'),
      delay: 2000,
      elapsed: 0,
    },
  ],
});

world.addSystem(createTimerEcsSystem(time));
```

## Repeating a task

Set `repeat: true` and an `interval`. `delay` is the wait before the first
run, and `interval` the wait between later runs:

```ts
addTimerComponent(world, entity, {
  tasks: [
    {
      callback: () => console.log('tick'),
      delay: 1000,
      elapsed: 0,
      repeat: true,
      interval: 500,
    },
  ],
});
```

A repeating task runs until it's removed. Set `maxRuns` to remove it after
that many runs. `runsSoFar` counts its runs.

:::caution
`repeat: true` has no effect without an `interval`: the task runs once and
is removed.
:::

## Adding a task to an existing timer

`tasks` is an array, so push a new task onto it:

```ts
import { TimerId } from '@forge-game-engine/forge/timer';

const timer = world.getComponentRequired(entity, TimerId);

timer.tasks.push({
  callback: () => console.log('3 seconds passed'),
  delay: 3000,
  elapsed: 0,
});
```

The task's time starts counting on the timer system's next update.

## Removing a task

Remove a task from `tasks` to cancel it before it runs:

```ts
const index = timer.tasks.indexOf(task);

if (index !== -1) {
  timer.tasks.splice(index, 1);
}
```

Removing the `TimerEcsComponent` with `world.removeComponent(entity, TimerId)`,
or removing the entity, cancels all of its tasks.
