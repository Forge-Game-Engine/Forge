---
sidebar_position: 1
---

# Game States

A [`GameState`](/Forge/docs/api/interfaces/GameState) holds one value from a
fixed set of state names and changes it at the start of a tick. Run
conditions created from a `GameState` decide which systems run in each
state, and which run on the tick a state is entered or left.

## Creating a game state

```ts
import { createGameState } from '@forge-game-engine/forge/states';

type GameStateName = 'menu' | 'playing' | 'paused';

const gameState = createGameState<GameStateName>(world, 'menu');
```

`createGameState` registers the systems and groups that apply transitions in
`world`. `gameState.current` is the current state.

## Changing state

`gameState.set(name)` requests a transition. The transition is applied at
the start of the next tick, in `world.firstSystemGroup`, which runs before
every other group, so every system in a tick reads the same `current`. When `set` is called more than once in a
tick, the last call is applied.

Calling `set` with the current state re-enters it. The transition runs the
same steps as a transition to another state.

## Running a system in some states

`inState(gameState, ...names)` returns a run condition that is `true` while
`current` is one of `names`. Pass it as `runIf`:

```ts
import { inState } from '@forge-game-engine/forge/states';

world.addSystem(enemyAiSystem, { runIf: inState(gameState, 'playing') });
world.addSystem(menuInputSystem, {
  runIf: inState(gameState, 'menu', 'paused'),
});
```

A system registered without `runIf` runs on every tick in every state. While
its run condition returns `false`, a system isn't queried and its `update`
isn't called. `addSystemGroup` takes `runIf` in the same way. See
[Run conditions](../ecs/system.md#run-conditions).

## Running a system when a state is entered or left

`onEnter(gameState, ...names)` returns a run condition that is `true` only on
the tick one of `names` is entered. `onExit(gameState, ...names)` is `true`
only on the tick one of `names` is left. Register these systems in
`gameState.enterGroup` and `gameState.exitGroup`:

```ts
import { onEnter, onExit } from '@forge-game-engine/forge/states';

world.addSystem(spawnPlayerSystem, {
  group: gameState.enterGroup,
  runIf: onEnter(gameState, 'playing'),
});
world.addSystem(saveHighScoreSystem, {
  group: gameState.exitGroup,
  runIf: onExit(gameState, 'playing'),
});
```

On the tick of a transition:

1. `current` changes. `exited` is set to the previous state and `entered` to
   the new one. Both are `null` on every other tick.
2. `exitGroup` runs.
3. [State-scoped entities](./state-scoped-entities.md) of the transition are
   removed.
4. `enterGroup` runs.
5. All other groups run.

`exitGroup` and `enterGroup` run before every other group of the world. An
`onEnter` or `onExit` system registered in another group runs on the same
tick, after the systems of every group ordered before it.

On the first tick, the initial state is entered: `entered` is the initial
state, `exited` is `null`, and its `onEnter` systems run.
