---
sidebar_position: 1
---

# Game States

A game state is one value from a fixed set of state names, such as `menu`,
`playing` and `paused`, that changes at the start of a tick. Systems can be
registered to run only in some states, or only on the tick a state is
entered or left, and entities can be removed when a state changes.

## Creating a game state

[`createGameState`](/Forge/docs/api/functions/createGameState) creates a
[`GameState`](/Forge/docs/api/interfaces/GameState) for a world, starting in
the given state:

```ts
import { createGameState } from '@forge-game-engine/forge/states';

type GameStateName = 'menu' | 'playing' | 'paused';

const gameState = createGameState<GameStateName>(world, 'menu');
```

`gameState.current` is the current state.

## Changing state

`set` requests a transition:

```ts
gameState.set('playing');
```

The transition is applied at the start of the next tick, before any other
system runs, so every system in a tick reads the same `current`. Calling
`set` with the current state leaves and re-enters it.

## Running systems in some states

[`inState`](/Forge/docs/api/functions/inState) creates a run condition that
is true while the game state is one of the given states. Pass it as `runIf`
when registering a system:

```ts
import { inState } from '@forge-game-engine/forge/states';

world.addSystem(enemyAiSystem, { runIf: inState(gameState, 'playing') });
```

The system runs only on ticks where `current` is `playing`. A system
registered without `runIf` runs in every state. See
[Run conditions](../ecs/system.md#run-conditions).

## Running systems when a state is entered or left

[`onEnter`](/Forge/docs/api/functions/onEnter) and
[`onExit`](/Forge/docs/api/functions/onExit) create run conditions that are
true only on the tick the game state enters or leaves one of the given
states. Register these systems in the game state's `enterGroup` and
`exitGroup`:

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

On the tick of a transition, the world runs:

1. the transition: `current` changes, `exited` is the state left and
   `entered` the state entered;
2. `exitGroup`;
3. the removal of state-scoped entities (see below);
4. `enterGroup`;
5. every other group.

On the first tick, the initial state is entered, so its `onEnter` systems
run.

## Removing entities when a state changes

[`addStateScopedComponent`](/Forge/docs/api/functions/addStateScopedComponent)
marks an entity to be removed when the game state leaves or enters given
states:

```ts
import { addStateScopedComponent } from '@forge-game-engine/forge/states';

addStateScopedComponent(world, enemy, {
  state: gameState,
  removeOnExit: ['playing'],
});
```

This entity is removed when the game state leaves `playing`.
`removeOnEnter` removes an entity when the game state enters one of the
listed states instead. With `removeOnEnter: ['playing', 'menu']`, an entity
created while playing is kept after `playing` is left, and removed when
`playing` or `menu` is next entered.

Removal happens between `exitGroup` and `enterGroup`, so `onExit` systems
can still read the entity.

:::note
Only the entity itself is removed. Entities parented to it aren't removed,
so give each child its own state-scoped component.
:::
