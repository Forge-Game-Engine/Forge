---
sidebar_position: 2
---

# State-Scoped Entities

A
[`StateScopedEcsComponent`](/Forge/docs/api/interfaces/StateScopedEcsComponent)
removes its entity when a [`GameState`](./index.md) leaves or enters given
states.

```ts
import { addStateScopedComponent } from '@forge-game-engine/forge/states';

addStateScopedComponent(world, enemy, {
  state: gameState,
  removeOnExit: ['playing'],
});
```

- `removeOnExit`: the entity is removed on a transition that leaves one of
  these states.
- `removeOnEnter`: the entity is removed on a transition that enters one of
  these states.

Both default to `[]`. `addStateScopedComponent` throws when both are empty.
An entity is only removed by transitions of the `GameState` in its `state`
field.

## When an entity is removed

Removal happens on the tick of the transition, after `exitGroup` runs and
before `enterGroup` runs. Systems in `exitGroup` can read the entity;
systems in `enterGroup` can't.

Calling `set` with the current state leaves and enters that state, so both
lists are checked against it.

On the first tick, the initial state is entered. An entity that exists
before the first tick and lists the initial state in `removeOnEnter` is
removed on that tick.

## Children

The entity is removed with `world.removeEntity`, which removes only that
entity. Entities parented to it with `addParentComponent` aren't removed.
Give each child its own `StateScopedEcsComponent`.
