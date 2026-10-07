# Particles

The particle system spawns short-lived sprite entities, called particles,
from a [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter), then
moves, fades and removes them over their lifetime.

The particle system is made of:

- [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter): a
  configuration object that sets the particles' sprite, speed, direction,
  scale, lifetime, motion, fade and spawn shape, and when they're emitted.
  [Configuring Emitters](./emitters.md) covers its options.
- [`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)
  (`ParticleEmitterId`): a map of named emitters on an entity. Particles
  spawn around that entity's world position.
- [`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent)
  (`ParticleId`): marks an entity as a particle and stores its velocity,
  acceleration, drag, spin and start and end opacity.
- [`createParticleEcsSystem`](/Forge/docs/api/functions/createParticleEcsSystem):
  spawns particles from the emitters.
- [`createParticlePositionEcsSystem`](/Forge/docs/api/functions/createParticlePositionEcsSystem):
  moves and spins each particle every frame.
- [`createParticleOpacityEcsSystem`](/Forge/docs/api/functions/createParticleOpacityEcsSystem):
  fades each particle's sprite over its lifetime.
- [`emitParticleBurst`](/Forge/docs/api/functions/emitParticleBurst): spawns
  a batch of particles at a world position, without an emitter entity.

## Particle entities

Each particle is an entity with these components:

- `PositionEcsComponent`, `RotationEcsComponent` and `ScaleEcsComponent`
- `SpriteEcsComponent`
- `ParticleEcsComponent`
- `LifetimeEcsComponent`, and the `RemoveFromWorldLifetimeStrategyId` tag
- `AgeScaleEcsComponent`

Besides the particle systems, particles use the
[lifecycle systems](../lifecycle/index.md) to expire and be removed, and
`createAgeScaleEcsSystem` to change scale over their lifetime.

## Emitting particles from an entity

Create a `ParticleEmitter`, add it to an entity's
`ParticleEmitterEcsComponent` with
[`addParticleEmitterComponent`](/Forge/docs/api/functions/addParticleEmitterComponent),
and register the particle, lifecycle and transform systems:

```ts
import {
  addPositionComponent,
  createAgeScaleEcsSystem,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random } from '@forge-game-engine/forge/math';
import {
  addParticleEmitterComponent,
  createParticleEcsSystem,
  createParticleOpacityEcsSystem,
  createParticlePositionEcsSystem,
  ParticleEmitter,
} from '@forge-game-engine/forge/particles';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');
const random = new Random();

const sparks = new ParticleEmitter(sparkSprite, {
  numParticlesRange: { min: 20, max: 30 },
  speedRange: { min: 100, max: 200 },
  lifetimeSecondsRange: { min: 0.3, max: 0.6 },
  lifetimeOpacity: { start: 1, end: 0 },
});

const emitterEntity = world.createEntity();

addPositionComponent(world, emitterEntity);
addParticleEmitterComponent(world, emitterEntity, {
  emitters: new Map([['sparks', sparks]]),
});

world.addSystem(createParticleEcsSystem(time, random));
world.addSystem(createParticlePositionEcsSystem(time));
world.addSystem(createLifetimeTrackingEcsSystem(time));
world.addSystem(createAgeScaleEcsSystem());
world.addSystem(createParticleOpacityEcsSystem());
world.addSystem(createRemoveFromWorldEcsSystem());
world.addSystem(createTransformEcsSystem());

sparks.emit();
```

`sparkSprite` is a sprite from `createImageSprite` or `createSprite`. On the
next frame, `createParticleEcsSystem` spawns a batch of 20 to 30 particles
at `emitterEntity`'s world position. [Bursts and steady
streams](./emitters.md#bursts-and-steady-streams) covers the other ways to
emit.

The particle systems, `createAgeScaleEcsSystem` and the spawn itself write
each particle's `local` position, rotation and scale. Register
`createTransformEcsSystem` after them and before rendering, so it writes the
`world` transform the renderer reads (see
[Transforms](../common/transforms.md)).

## Moving an emitter

The emitter reads its entity's `world` position and rotation when it spawns
a particle. Move or turn the emitter entity by writing its `position.local`
and `rotation.local`, or by giving it a parent with `world.setParent` (see
[Emitters turn with their entity](./emitters.md#emitters-turn-with-their-entity)).

A particle moves in world space once it has spawned, so moving the emitter
doesn't move the particles it already spawned.

## Particle sprites

`ParticleEmitter` takes either a `SpriteEcsComponent` (from
`createImageSprite`) or a `Sprite` (from `createSprite`). Fields a `Sprite`
lacks, such as `enabled` and `layer`, get the defaults `addSpriteComponent`
gives them. Particles are drawn on the sprite's `layer`.

Each particle gets its own copy of the sprite, so a system can change one
particle's `tintColor` or `opacityMultiplier` without changing the other
particles from the same emitter. Changing the emitter's `sprite` affects
only particles spawned after the change.

## Removing particles and emitters

A particle is removed from the world when its lifetime ends, by
`createLifetimeTrackingEcsSystem` and `createRemoveFromWorldEcsSystem`.

To stop an emitter, delete it from its component's `emitters` map, or
remove the `ParticleEmitterEcsComponent` with
`world.removeComponent(entity, ParticleEmitterId)`. Particles it already
spawned stay until their lifetime ends.
