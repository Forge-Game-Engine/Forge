---
sidebar_position: 1
---

# Configuring Emitters

A [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter) is a
configuration object, not a component. Its options, passed to its
constructor or to `setOptions`, set how its particles look and move. It
spawns particles from a
[`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)'s
`emitters` map, or from
[`emitParticleBurst`](/Forge/docs/api/functions/emitParticleBurst).

## Ranges

Most options are a [`Range`](/Forge/docs/api/interfaces/Range), with a
`min` and a `max`. Each particle picks its own random value in the range
for its speed, direction, scale, rotation, rotation speed and lifetime. A
range with `min` equal to `max` gives every particle the same value:

```ts
const emitter = new ParticleEmitter(sprite, {
  scaleRange: { min: 0.5, max: 0.5 },
});
```

## Direction and sprite rotation

`directionRange` is the direction a particle starts moving in, in radians,
following the engine's
[angle convention](../math/angles-and-rotation.md#the-angle-convention): `0`
points along `+X` and angles increase counter-clockwise (`Math.PI / 2` is
up, `Math.PI` is left). A range spanning a full turn, such as the default
`{ min: 0, max: 2 * Math.PI }`, sends particles in every direction. This
range sends them downwards, in a cone a quarter turn wide:

```ts
const emitter = new ParticleEmitter(sprite, {
  directionRange: {
    min: -Math.PI / 2 - Math.PI / 4,
    max: -Math.PI / 2 + Math.PI / 4,
  },
});
```

`rotationRange` (in radians, counter-clockwise) and `rotationSpeedRange` (in
radians per second) turn the particle's sprite. They don't change the
direction the particle moves in.

## Velocity, acceleration and drag

Each particle's
[`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent)
stores a `velocity`, from `speedRange` and the direction it spawns with.
`createParticlePositionEcsSystem` changes it every frame:

- `acceleration`, in world units per second squared, is added to the
  velocity, for example `{ x: 0, y: -400 }` for gravity.
- `drag` is the share of the velocity a particle keeps after one second,
  from `0` to `1`. `1` is no drag, and `0.1` keeps a tenth of the velocity
  after one second.

`getVelocityOffset` is a function returning a velocity that every particle
adds to its own each frame. Drag doesn't slow it down. Use it for motion
that follows a value that changes, for example a world scrolling past:

```ts
const emitter = new ParticleEmitter(sprite, {
  getVelocityOffset: () => ({ x: -scrollSpeed, y: 0 }),
});
```

`velocity` and `acceleration` on each particle are mutable vectors, so other
systems can change them too.

## Spawn shapes

Particles spawn around an origin: the world position
(`PositionEcsComponent.world`) of the entity the emitter is on, or the world
origin if that entity has no position. `spawnShape` sets the area around
the origin they spawn in:

- `{ type: 'point' }` (the default): at the origin.
- `{ type: 'circle', radius }`: anywhere inside a circle, spread evenly over
  its area.
- `{ type: 'ring', radius }`: on the edge of a circle.
- `{ type: 'box', width, height }`: anywhere inside a box centered on the
  origin. A `height` of `0` gives a line.

With `emitOutward: true`, each particle moves away from the shape's center,
through the point it spawned at, instead of in a direction from
`directionRange`. A particle that spawns at the center (every particle of a
`'point'` shape) uses `directionRange`.

```ts
const emitter = new ParticleEmitter(sprite, {
  spawnShape: { type: 'ring', radius: 32 },
  emitOutward: true,
});
```

## Emitters turn with their entity

The spawn shape and `directionRange` turn with the world rotation
(`RotationEcsComponent.world`) of the entity the emitter is on. An emitter
on a child entity keeps the same direction relative to its parent as the
parent turns:

```ts
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
} from '@forge-game-engine/forge/particles';

const exhaust = world.createEntity();

world.setParent(exhaust, vehicle);
addPositionComponent(world, exhaust, { local: { x: -40, y: 0 } });
addRotationComponent(world, exhaust);
addParticleEmitterComponent(world, exhaust, {
  emitters: new Map([
    [
      'exhaust',
      new ParticleEmitter(smokeSprite, {
        emissionRate: 30,
        directionRange: {
          min: Math.PI - Math.PI / 12,
          max: Math.PI + Math.PI / 12,
        },
      }),
    ],
  ]),
});
```

These particles move out of the back of `vehicle`, whichever way it faces.

Some things don't turn with the entity:

- An entity with no `RotationEcsComponent` emits in the world's frame.
- The transform system writes `rotation.world` only for entities with a
  `PositionEcsComponent`, so a turning emitter needs a position as well as a
  rotation.
- `acceleration` and `getVelocityOffset` are in world space.
- `rotationRange` is the particle sprite's world rotation, not relative to
  the emitter.
- Spawn shapes don't scale or mirror with the entity's scale.

## Bursts and steady streams

An emitter spawns particles in three ways:

- `emit()` starts a batch of particles, with a count picked from
  `numParticlesRange`. With `emitDurationSeconds` at `0` (the default), the
  whole batch spawns on the next frame; above `0`, the batch spawns evenly
  over that many seconds. `emit()` always starts a new batch, and
  `emitIfNotEmitting()` starts one only when no batch is spawning.
- `emissionRate` spawns that many particles per second, every frame, while
  it's above `0`. Set it to `0` with `setOptions` to stop the stream. An
  emitter can stream and spawn batches at the same time.
- [`emitParticleBurst`](/Forge/docs/api/functions/emitParticleBurst) spawns
  a batch immediately at a world position, from an emitter that doesn't
  need to be on an entity, for example at the position of an entity that was removed:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { emitParticleBurst } from '@forge-game-engine/forge/particles';

const burstPosition = Vec2.clone(position.world);

world.removeEntity(entity);
emitParticleBurst(world, emitter, burstPosition, random);
```

`emitParticleBurst` returns the new particle entities. It emits in the
world's frame, unless its options pass a `rotation` to turn the spawn shape
and `directionRange` by.

## Fading and scaling over a lifetime

`lifetimeOpacity` fades each particle's sprite from `start` to `end` over
its lifetime, for example `{ start: 1, end: 0 }` to fade out. It sets the
sprite's `opacityMultiplier`, which multiplies the alpha of its
`tintColor`. Fading needs `createParticleOpacityEcsSystem`.

`lifetimeScaleReduction` multiplies a particle's scale by the end of its
lifetime: `1` keeps it the same size, and above `1` makes it grow. Scaling
needs `createAgeScaleEcsSystem`.

:::caution
`lifetimeScaleReduction` defaults to `0`, so with `createAgeScaleEcsSystem`
registered, particles shrink to nothing by the end of their lifetime. Set it
to `1` to keep their size.
:::

## Adding your own components

`onParticleSpawned` is called for every particle right after it spawns,
with all of its components added. Use it to add components or tags for
other systems:

```ts
const emitter = new ParticleEmitter(sprite, {
  emissionRate: 20,
  onParticleSpawned: (world, particle) => {
    world.addTag(particle, customTagId);
  },
});
```

## Multiple emitters per entity

`ParticleEmitterEcsComponent.emitters` is a `Map<string, ParticleEmitter>`,
so one entity can have several emitters, each started on its own:

```ts
addParticleEmitterComponent(world, entity, {
  emitters: new Map([
    ['attack', attackEmitter],
    ['footstep', footstepEmitter],
  ]),
});

attackEmitter.emit();
```

:::note
Each particle is an entity with seven components and its own copy of the
sprite. The number of particles alive at once, which follows from
`numParticlesRange`, `emissionRate` and `lifetimeSecondsRange`, is the
number of entities the particle, lifecycle and render systems process each
frame.
:::
