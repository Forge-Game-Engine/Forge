---
sidebar_position: 1
---

# Creating Custom Events

Use [`ForgeEvent`](/Forge/docs/api/classes/ForgeEvent) and
[`ParameterizedForgeEvent`](/Forge/docs/api/classes/ParameterizedForgeEvent)
to let other parts of your game react to something happening, without those
parts needing to poll your component's state every frame.

## Picking the right event type

- Use `ForgeEvent` when listeners only need to know that something happened,
  not any details about it, for example `onAnimationStartEvent` and
  `onAnimationEndEvent` on
  [`AnimationClip`](/Forge/docs/api/classes/AnimationClip).
- Use `ParameterizedForgeEvent<T>` when listeners need data about what
  happened, for example `valueChangeEvent` on
  [`Axis2dAction`](/Forge/docs/api/classes/Axis2dAction) passes the new
  `Vector2` value, and `onAnimationFrameChangeEvent` passes the new
  `AnimationFrame`.

## A worked example

Define a component that carries its own events alongside its data. Create
the event instances once, when the component is added, and `raise()` them
whenever the relevant data actually changes:

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';
import {
  ForgeEvent,
  ParameterizedForgeEvent,
} from '@forge-game-engine/forge/events';

interface HealthComponent {
  current: number;
  max: number;
  onDamaged: ParameterizedForgeEvent<number>;
  onDied: ForgeEvent;
}

const Health = createComponentId<HealthComponent>('health');

const health = world.addComponent(player, Health, {
  current: 100,
  max: 100,
  onDamaged: new ParameterizedForgeEvent<number>('player-damaged'),
  onDied: new ForgeEvent('player-died'),
});
```

A system that applies damage raises these events when the data actually
changes:

```ts
const damageSystem = {
  query: [Health] as const,
  run(result, world) {
    const [health] = result.components as [HealthComponent];
    const damage = getIncomingDamage(); // however this is determined

    if (damage <= 0) {
      return;
    }

    health.current = Math.max(0, health.current - damage);
    health.onDamaged.raise(damage);

    if (health.current === 0) {
      health.onDied.raise();
    }
  },
};
```

Anything else that needs to react, UI, audio, achievements, can register a
listener once during setup and stay completely decoupled from the system
that applies damage:

```ts
health.onDamaged.registerListener((damage) => {
  showDamagePopup(player, damage);
});

health.onDied.registerListener(() => {
  showGameOverScreen();
});
```

This is the kind of explicit, event-based coordination the
[System guide](../ecs/system.md) recommends over relying on implicit
ordering between systems.

## Gotchas

### A throwing listener stops the rest

`raise()` calls each listener in order. If a listener throws, Forge logs the
error and rethrows it, so listeners registered after the failing one do not
run for that `raise()` call, and the error propagates to whoever called
`raise()`. Keep listener logic simple, or give risky listeners their own
`try`/`catch` if one listener's failure shouldn't stop the others.

### Create events once, not every frame

`ForgeEvent` and `ParameterizedForgeEvent` instances hold their listeners
internally. Creating a new instance inside `run()` or another per-frame path
discards every listener that was previously registered. Create the event
once, as part of the component's initial data or in a constructor, and call
`raise()` on that same instance repeatedly.

### Deregister listeners when you're done with them

`registerListener` keeps a strong reference to the listener function,
including anything it captures. If an entity is removed, or a component is
returned to a pool, without de-registering its listeners, those closures stay
alive and keep firing for state that no longer matters. Call
`deregisterListener` with the same function reference during cleanup, or
`clear()` to remove every listener at once, for example when resetting a
pooled component for reuse.

### `listeners` is the live list, not a copy

The `listeners` getter returns Forge's internal array directly. Use it for
inspection, for example in tests, but make changes through
`registerListener` and `deregisterListener` rather than mutating the array.

## Common mistakes

❌ Recreating the event loses every previously registered listener:

```ts
run(result, world) {
  const [health] = result.components as [HealthComponent];

  // a fresh event every tick, nobody is listening to this one
  health.onDamaged = new ParameterizedForgeEvent<number>('player-damaged');
  health.onDamaged.raise(damage);
}
```

✅ Create the event once when the component is added, and only `raise()` it
from systems:

```ts
world.addComponent(player, Health, {
  current: 100,
  max: 100,
  onDamaged: new ParameterizedForgeEvent<number>('player-damaged'),
  onDied: new ForgeEvent('player-died'),
});
```

## Performance notes

Only `raise()` an event when the underlying value actually changes, not on
every tick a system runs.
[`Axis2dAction.set()`](/Forge/docs/api/classes/Axis2dAction#set) follows this
pattern, returning early if the new value matches the current one, so
`valueChangeEvent` only fires, and only runs its listeners, on real changes:

```ts
public set(x: number, y: number): void {
  if (this._value.x === x && this._value.y === y) {
    return;
  }

  this._value.x = x;
  this._value.y = y;

  this.valueChangeEvent.raise(this._value);
}
```

Raising an event you don't need to costs a loop over every registered
listener, for every entity, every frame, those costs add up quickly in a
busy world.
