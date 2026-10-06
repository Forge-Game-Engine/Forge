---
sidebar_position: 1
---

# Game States

Most games move between a few top-level states: a menu, playing, paused,
game over. Most of their systems only make sense in some of them, and each
state has setup and teardown work: spawning the player when a round starts,
clearing the board when it ends.

The `@forge-game-engine/forge/states` module covers both halves:

- a [`GameState`](/Forge/docs/api/interfaces/GameState) that switches at the
  start of a tick,
- run conditions (`inState`, `onEnter`, `onExit`) that decide which systems
  run,
- [state-scoped entities](./state-scoped-entities.md), removed when the
  state that owns them ends.

## Creating a state

```ts
import { createGameState } from '@forge-game-engine/forge/states';

type GameStateName = 'menu' | 'playing' | 'paused' | 'gameOver';

const gameState = createGameState<GameStateName>(world, 'menu');
```

`gameState.current` is the current state. Call `gameState.set('playing')` to
switch. The switch happens at the start of the next tick, not when `set` is
called, so every system of a tick sees the same state. If `set` is called
more than once in a tick, the last call wins.

## Running systems only in some states

A system registered without `runIf` runs on every tick, whatever the
state. Register it with `runIf: inState(...)` to run it only in those
states:

```ts
import { inState } from '@forge-game-engine/forge/states';

world.addSystem(createEnemyAiEcsSystem(time), {
  runIf: inState(gameState, 'playing'),
});
world.addSystem(createMenuInputEcsSystem(gameState), {
  runIf: inState(gameState, 'menu', 'paused'),
});
```

A gated system isn't queried or updated while its condition is false, so a
`paused` state that leaves gameplay systems out stops them where they are.
`Time` keeps running during the pause: a system that steps with
`time.deltaTimeInSeconds` resumes where it stopped, but one that compares
against `time.timeInSeconds` counts the pause as elapsed time.

Gate a whole system group the same way, with `addSystemGroup`'s `runIf`.
See [System](../ecs/system.md#run-conditions) for how run conditions work.

## Setting up and tearing down a state

Work that happens once per transition (spawning the player, saving a high
score, showing a screen) goes in a system registered in the state's
`enterGroup` or `exitGroup`, gated with `onEnter` or `onExit`:

```ts
import { onEnter, onExit } from '@forge-game-engine/forge/states';

world.addSystem(createSpawnPlayerEcsSystem(), {
  group: gameState.enterGroup,
  runIf: onEnter(gameState, 'playing'),
});
world.addSystem(createSaveHighScoreEcsSystem(scores), {
  group: gameState.exitGroup,
  runIf: onExit(gameState, 'playing'),
});
```

A transition runs at the start of a tick, in this order:

1. The state switches. `gameState.exited` is the state left and
   `gameState.entered` the state entered, for this tick only.
2. The `exitGroup` runs. Its systems can still read the entities of the
   state being left.
3. [State-scoped entities](./state-scoped-entities.md) whose state ended are
   removed.
4. The `enterGroup` runs, so the new state is set up before any other
   system sees it.
5. Every other group of the world runs.

On the first tick, the initial state counts as entered: `entered` is the
initial state and its `onEnter` systems run. Build a state's content in its
`onEnter` system rather than in setup code, and it's built the same way the
first time and every time after.

Keep `onEnter` and `onExit` systems in the state's groups. In any other
group, they'd run later in the tick, after gameplay systems that should have
seen what they set up.

### Restarting a state

Setting the current state again re-enters it: its exit systems run, its
scoped entities are removed, and its enter systems run. `gameState.set('playing')`
while playing restarts the round without a detour through another state.

## Input and the start of the tick

The state's transition and its exit and enter groups run before every other
group of the world, including the input update group `registerInputs` adds.
An `onEnter` or `onExit` system reads the previous tick's input. Act on
input in an ordinary system that calls `set`, as the
[game states demo](/Forge/demos/game-states)'s input systems do, and the
transition follows on the next tick.

## Several worlds

A `GameState` belongs to the world passed to `createGameState`, which
switches it and runs its exit and enter groups. A system in another world,
such as a UI overlay world, can still be gated on it with `inState`, since a
run condition only reads the state. A world that `Game` updates after the
owning world sees each transition in the same frame.

## Mistakes to avoid

Checking the state at the top of `update`:

```ts
// Don't
update: (world, result) => {
  if (gameState.current !== 'playing') {
    return;
  }
  // ...
},
```

The system is still queried every tick, and the gate is hidden inside it.
Register it with `runIf: inState(gameState, 'playing')` instead.

Removing a round's entities kind by kind in an `onExit` system: scope them
to the state instead, so every entity a round creates goes with it,
including kinds added later.
