---
sidebar_position: 2
---

# State-Scoped Entities

An entity that belongs to a state, such as a menu's labels or the enemies
spawned while playing, gets a
[`StateScopedEcsComponent`](/Forge/docs/api/interfaces/StateScopedEcsComponent).
When its state ends, the transition removes it, so no system has to find
and remove each kind of entity a state created.

```ts
import { addStateScopedComponent } from '@forge-game-engine/forge/states';

addStateScopedComponent(world, enemy, {
  state: gameState,
  removeOnExit: ['playing'],
});
```

The entity is removed when `gameState` leaves one of `removeOnExit`, or enters
one of `removeOnEnter`. At least one of the two lists has to name a state,
or `addStateScopedComponent` throws.

Removal happens between the state's `exitGroup` and `enterGroup`, so
`onExit` systems still see the entities, and `onEnter` systems don't.

## Removing on exit or on enter

`removeOnExit` is the common case: the menu's labels go when the menu is
left.

`removeOnEnter` is for entities that stay after their state ends. Enemies
left over from `playing` can stay on screen during `gameOver`, and be removed
when `playing` or `menu` is entered:

```ts
addStateScopedComponent(world, enemy, {
  state: gameState,
  removeOnEnter: ['playing', 'menu'],
});
```

Re-entering a state counts as entering it, so `removeOnEnter: ['playing']`
also removes the entity when `gameState.set('playing')` restarts `playing`.

An entity scoped with `removeOnEnter` on the initial state and created
before the first tick is removed on that tick, since the initial state is
entered then.

## Entities created at runtime

Scope an entity where it's created. For particles, which their emitter
creates, add the component in the emitter's `onParticleSpawned` callback.

## Children

Removing a scoped entity removes that entity only. Removing an entity
doesn't remove the entities parented to it with `addParentComponent` (see
[World](../ecs/world.md#removing-an-entity-from-the-world)), so give each
child its own `StateScopedEcsComponent` with the same lists.
