---
sidebar_position: 1
---

# Configuring Emitters

[`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter) is a plain
configuration object, not a component on its own. Create one (or several),
store them in a
[`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)'s
`emitters` map, then call `emit()` or `emitIfNotEmitting()` whenever you want
a burst.

## Ranges

Most options are [`Range`](/Forge/docs/api/interfaces/Range) objects with a
`min` and `max`. Each spawned particle independently picks a random value
inside that range for its speed, scale, lifetime, and rotation speed. Set
`min` equal to `max` for a fixed value, for example `scaleRange: { min: 0.5,
max: 0.5 }` makes every particle the same size.

`rotationRange` is the exception: it's measured in degrees and has two
special cases worth knowing:

- If `min` and `max` are equal, every particle spawns at exactly that angle.
- If the range spans a full 360 degrees, including the default `{ min: 0,
max: 360 }`, particles spawn at a fully random angle. This is the usual
  choice for an omnidirectional burst like an explosion.

For anything in between, particles spawn following the convention used by
`createParticlePositionEcsSystem`: 0 degrees points up the screen and angles
increase clockwise (90 = right, 180 = down, 270 = left). For example, `{
min: 135, max: 225 }` sprays particles in a 90 degree cone centered on
straight down, useful for a dust puff under a character's feet. Keep `min`
less than `max`, ranges that wrap past 360 back to 0 aren't supported.

## Bursts vs continuous emission

`emitDurationSeconds` controls how the particles in `numParticlesRange` are
spread out over time:

- `0` (the default): all particles spawn on the same frame, a single burst.
  Good for impacts, explosions, and hits.
- Greater than `0`: particles spawn gradually over that many seconds, roughly
  evenly spaced. Good for continuous effects like smoke trails, engine
  exhaust, or rain while the emitter is active.

Either way, call `emit()` to start a new emission immediately, restarting
`currentEmitDuration` and picking a new `totalAmountToEmit`. Use
`emitIfNotEmitting()` instead when you don't want overlapping bursts to stack,
for example an input-triggered effect that might be retriggered before the
previous burst finishes.

## Spawn position

`spawnPosition` is called once per particle and returns the
[`Vector2`](/Forge/docs/api/classes/Vector2) world position it spawns at. The
default spawns everything at the origin, so most emitters override it with
the position of whatever is producing the effect:

```ts
sparks.setOptions({
  spawnPosition: () => playerPosition.clone(),
});
```

Because it's a function, it can also describe a moving spawn point. For
continuous emitters (`emitDurationSeconds` greater than `0`), `currentEmitDuration`
and `emitDurationSeconds` are both readable on the emitter, so you can trace
a path over the course of an emission:

```ts
trailEmitter.setOptions({
  spawnPosition: () => {
    const progress =
      trailEmitter.currentEmitDuration / trailEmitter.emitDurationSeconds;

    return new Vector2(progress * 1200 - 600, 0);
  },
});
```

## Shrinking or growing over a lifetime

`lifetimeScaleReduction` blends each particle's scale from its spawned
`scaleRange` value down to that value multiplied by `lifetimeScaleReduction`
over its lifetime: `0` (the default) shrinks particles to nothing by the time
they expire, `1` keeps them the same size, and values above `1` make them
grow. This only takes effect if `createAgeScaleEcsSystem` is registered, see
the [Quick Start](./index.md#quick-start).

## Multiple emitters per entity

`ParticleEmitterEcsComponent.emitters` is a `Map<string, ParticleEmitter>`,
so one entity can own several independent effects, for example an attack
swoosh and a footstep puff on the same character:

```ts
world.addComponent(character, ParticleEmitterId, {
  emitters: new Map([
    ['attack', attackEmitter],
    ['footstep', footstepEmitter],
  ]),
});

// later, in your attack/footstep handling code
attackEmitter.emit();
```

:::caution
`createParticleEcsSystem` checks every emitter on every entity with a
`ParticleEmitterEcsComponent` each frame, even when nothing is currently
emitting, so adding more emitters is cheap. Spawning particles isn't free
though, each one is a full entity with seven components. A
`numParticlesRange` of `{ min: 60, max: 80 }` for an occasional explosion is
fine, but triggering that many particles every frame from several sources at
once will add up.
:::
