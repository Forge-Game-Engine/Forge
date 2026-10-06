---
sidebar_position: 1
---

# Configuring Emitters

[`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter) is a plain
configuration object, not a component on its own. Create one (or several),
store them in a
[`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)'s
`emitters` map, then call `emit()`, set an `emissionRate`, or pass the
emitter to `emitParticleBurst`.

## Ranges

Most options are [`Range`](/Forge/docs/api/interfaces/Range) objects with a
`min` and `max`. Each spawned particle independently picks a random value
inside that range for its speed, direction, scale, rotation, rotation speed
and lifetime. Set `min` equal to `max` for a fixed value, for example
`scaleRange: { min: 0.5, max: 0.5 }` makes every particle the same size.

## Direction and rotation are separate

`directionRange` picks the direction a particle starts moving in, in
radians, following the engine's [angle
convention](../math/angles-and-rotation.md#the-convention): `0` points
along `+X` and angles increase counter-clockwise (`Math.PI / 2` = up,
`Math.PI` = left, `-Math.PI / 2` = down). For example,
`{ min: -Math.PI / 2 - Math.PI / 4, max: -Math.PI / 2 + Math.PI / 4 }`
sprays particles in a quarter-turn cone centered on straight down, useful
for a dust puff under a character's feet. A range spanning a full turn,
including the default `{ min: 0, max: 2 * Math.PI }`, sends particles in any
direction. Keep `min` less than `max`. Use `degreesToRadians` if you'd
rather author the angles in degrees.

`rotationRange` (in radians, counter-clockwise) and `rotationSpeedRange` (in
radians per second) only turn the particle's sprite. They never change the
direction it moves in, so a spinning star still flies in a straight line.
`rotationRange` defaults to `{ min: 0, max: 0 }`; use
`{ min: 0, max: 2 * Math.PI }` to give round or symmetrical sprites some
variety.

## Motion: velocity, acceleration and drag

Each particle stores a `velocity` in its
[`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent),
picked from `speedRange` and its direction when it spawns.
`createParticlePositionEcsSystem` then changes it every frame:

- `acceleration` (world units per second squared) is added to the velocity.
  Use it for gravity (`{ x: 0, y: -400 }`), smoke rising
  (`{ x: 0, y: 40 }`) or wind.
- `drag` is the share of the velocity a particle keeps after one second,
  from `0` to `1`. `1` (the default) is no drag, `0.1` keeps a tenth of its
  speed after a second, which suits sparks that burst out fast and then
  hang in the air.

For motion that follows game state, set `getVelocityOffset`. It's read every
frame and added to each particle's movement on top of its own velocity, and
drag never slows it down. For example, to keep sparks moving with a world
that scrolls past at a changing speed:

```ts
const sparks = new ParticleEmitter(sparkSprite, {
  getVelocityOffset: () => ({ x: -gameState.worldSpeed, y: 0 }),
});
```

`velocity` and `acceleration` on each particle are plain, mutable vectors,
so your own systems can change them too.

## Where particles spawn

Particles spawn around an **origin**: the world position
(`PositionEcsComponent.world`) of the entity the emitter is on, or the world
origin if that entity has no position. Moving the entity moves the effect,
with no per-emitter closure needed.

`spawnShape` sets the area around the origin they spawn in:

- `{ type: 'point' }` (the default): exactly at the origin.
- `{ type: 'circle', radius }`: anywhere inside a circle, spread evenly over
  its area.
- `{ type: 'ring', radius }`: on the edge of a circle, such as the rim of a
  glowing orb.
- `{ type: 'box', width, height }`: anywhere inside a box centered on the
  origin. A `height` of `0` gives a line, for a fountain or a row of
  burners.

## Emitters turn with their entity

The spawn shape and `directionRange` are in the **emitter's frame**: they
turn with the world rotation (`RotationEcsComponent.world`) of the entity
the emitter is on. An emitter on a child entity, such as a ship's exhaust
or a gun's muzzle flash, keeps pointing the same way relative to its parent
as the parent turns, with no code to update its range:

```ts
const exhaust = world.createEntity();

addParentComponent(world, exhaust, { parent: ship });
addPositionComponent(world, exhaust, { local: { x: -40, y: 0 } });
addRotationComponent(world, exhaust);
addParticleEmitterComponent(world, exhaust, {
  emitters: new Map([
    [
      'exhaust',
      new ParticleEmitter(smokeSprite, {
        emissionRate: 30,
        // Out of the back of the ship, whichever way it's facing.
        directionRange: {
          min: Math.PI - Math.PI / 12,
          max: Math.PI + Math.PI / 12,
        },
      }),
    ],
  ]),
});
```

A few things don't turn with the entity:

- An entity with no `RotationEcsComponent` emits in the world's frame. Put
  an emitter that should always spray the same way in the world, like a
  fountain, on an entity without a rotation.
- The world rotation comes from the transform system, which only updates
  entities with a `PositionEcsComponent`, so a turning emitter needs a
  position as well as a rotation.
- `acceleration` and `getVelocityOffset` stay in world space, since they
  model forces like gravity and wind.
- `rotationRange` is the particle sprite's world rotation, not one relative
  to the emitter.
- Spawn shapes don't scale or mirror with the entity's scale.
- Particles move in world space once they've spawned, so they don't follow
  the emitter afterwards.

Set `emitOutward: true` to send each particle away from the shape's center,
through the point it spawned at, instead of in a direction from
`directionRange`. With a ring, that gives a burst that radiates out from an
object's edge. A particle spawned exactly on the center (always, for a
point) still uses `directionRange`.

## Bursts vs steady streams

There are three ways to spawn particles:

- **`emit()` / `emitIfNotEmitting()`** spawn a batch, picking how many from
  `numParticlesRange`. `emitDurationSeconds` spreads them out: `0` (the
  default) spawns them all on the same frame, good for impacts and
  explosions; greater than `0` spawns them roughly evenly over that many
  seconds. `emit()` always starts a new batch. `emitIfNotEmitting()` does
  nothing while a batch is still going, for input-triggered effects that
  might be retriggered before the previous one finishes.
- **`emissionRate`** spawns that many particles per second, every frame, for
  as long as it's above `0`, with no calls needed. Use it for anything that
  should run while something exists: a torch, an exhaust, an orb shedding
  sparks. Set it to `0` with `setOptions` to stop the stream. It works
  alongside `emit()`, so one emitter can both stream and burst.
- **[`emitParticleBurst`](/Forge/docs/api/functions/emitParticleBurst)**
  spawns a batch straight away at any world position, with no emitter
  entity. It's for effects at a place where nothing lives any more, like a
  pickup that was just collected:

```ts
import { emitParticleBurst } from '@forge-game-engine/forge/particles';

const pickupPosition = Vec2.clone(position.world);

world.removeEntity(orb);
emitParticleBurst(world, pickupSparks, pickupPosition, random, {
  count: 28,
});
```

`emitParticleBurst` picks the count from `numParticlesRange` unless you pass
`count`, and returns the new particle entities. It has no entity to turn
with, so it emits in the world's frame unless you pass a `rotation` (in
radians) to turn the spawn shape and `directionRange` by, for example the
rotation of the thing that just exploded.

## Fading, shrinking and growing over a lifetime

`lifetimeOpacity` fades each particle's sprite from `start` to `end` over its
lifetime, for example `{ start: 1, end: 0 }` to fade out completely. It sets
the sprite's `opacityMultiplier`, so it combines with the alpha of the
sprite's `tintColor`. This needs `createParticleOpacityEcsSystem`.

`lifetimeScaleReduction` blends each particle's scale from its spawned
`scaleRange` value to that value multiplied by `lifetimeScaleReduction`
over its lifetime: `0` (the default) shrinks particles to nothing by the time
they expire, `1` keeps them the same size, and values above `1` make them
grow. This needs `createAgeScaleEcsSystem`, see the
[Quick Start](./index.md#quick-start).

## Adding your own components

`onParticleSpawned` is called for every particle right after it spawns, with
all of its components attached. Use it to tag particles for your own
systems, or to parent them to another entity:

```ts
const embers = new ParticleEmitter(emberSprite, {
  emissionRate: 20,
  onParticleSpawned: (world, particle) => {
    world.addTag(particle, emberTagId);
  },
});
```

## Multiple emitters per entity

`ParticleEmitterEcsComponent.emitters` is a `Map<string, ParticleEmitter>`,
so one entity can own several independent effects, for example an attack
swoosh and a footstep puff on the same character:

```ts
addParticleEmitterComponent(world, character, {
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
though: each one is a full entity with seven components, including its own copy
of the sprite.
A `numParticlesRange` of `{ min: 60, max: 80 }` for an occasional explosion
is fine, but a high `emissionRate` on many entities at once will add up.
:::
