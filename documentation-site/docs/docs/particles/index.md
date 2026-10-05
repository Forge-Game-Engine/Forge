# Particles

Forge's particle system spawns short-lived entities from a single
configuration object, [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter).
Each spawned particle is a regular entity built from the same components used
everywhere else in the engine, position, rotation, scale, sprite, lifetime,
and age-scale, plus a
[`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent)
holding its velocity, acceleration, drag, spin and opacity range. Because
particles are just entities, the existing lifecycle and age-scale systems
shrink and eventually remove them; the particle-specific systems handle
spawning, movement and fading.

Core concepts:

- [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter): describes how
  particles look and behave when spawned (the sprite, speed, direction,
  scale, lifetime, acceleration, drag, fade and spawn shape) and when to
  emit them.
- [`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)
  (`ParticleEmitterId`): attaches one or more named emitters to an entity.
  Particles spawn around that entity's world position.
- [`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent)
  (`ParticleId`): marks an entity as a particle and stores how it moves,
  spins and fades.
- [`createParticleEcsSystem`](/Forge/docs/api/functions/createParticleEcsSystem):
  spawns particle entities from active emitters.
- [`createParticlePositionEcsSystem`](/Forge/docs/api/functions/createParticlePositionEcsSystem):
  moves and spins each particle every frame.
- [`createParticleOpacityEcsSystem`](/Forge/docs/api/functions/createParticleOpacityEcsSystem):
  fades each particle's sprite over its lifetime.
- [`emitParticleBurst`](/Forge/docs/api/functions/emitParticleBurst): spawns
  a one-off burst at any world position, with no emitter entity needed.

Guides in this section:

- [Configuring Emitters](./emitters.md): ranges, motion, spawn shapes,
  bursts vs steady streams, fading, and running multiple emitters on one
  entity.

## Quick Start

A particle emitter lives on an entity inside a
[`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent),
keyed by name so one entity can drive several effects (for example "attack"
and "footstep" emitters on a player). Spawning particles needs
`createParticleEcsSystem`, moving them needs
`createParticlePositionEcsSystem`, and fading them needs
`createParticleOpacityEcsSystem`. Particles also rely on the lifecycle
systems to expire and remove themselves, and on `createAgeScaleEcsSystem` if
you want them to shrink (or grow) over their lifetime:

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

// sparkSprite comes from createImageSprite (or createSprite).
const sparks = new ParticleEmitter(sparkSprite, {
  numParticlesRange: { min: 20, max: 30 },
  speedRange: { min: 100, max: 200 },
  drag: 0.1,
  scaleRange: { min: 0.4, max: 0.8 },
  lifetimeSecondsRange: { min: 0.3, max: 0.6 },
  lifetimeOpacity: { start: 1, end: 0 },
});

const emitterEntity = world.createEntity();

// Particles spawn around this entity's world position.
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
// The particle systems above write each particle's local transform; the
// transform system turns it into the world transform the renderer reads.
world.addSystem(createTransformEcsSystem());

// trigger a burst of sparks, e.g. on impact
sparks.emitIfNotEmitting();
```

Each spawned particle removes itself from the world once its lifetime
expires, so there's nothing to clean up yourself.

## Transforms

Like every system that moves entities, the particle systems only write each
particle's `local` position, rotation and scale. Register
`createTransformEcsSystem` after them and before rendering to turn those
into the world transform (see [Transforms](../common/transforms.md)). That
also covers a particle you give a
[`ParentEcsComponent`](/Forge/docs/api/interfaces/ParentEcsComponent), for
example from `onParticleSpawned` to make particles follow a moving ship.
Removing the ship then removes those particles with it.

The emitter reads its entity's **world** position, so move the emitter
entity by writing its `position.local`.

## Sprites

`ParticleEmitter` takes either a `SpriteEcsComponent` (from
`createImageSprite`) or a `Sprite` (from `createSprite`). Fields a `Sprite`
lacks, like `enabled` and `layer`, get the same defaults `addSpriteComponent`
gives them. Particles are drawn on the sprite's `layer`.

Every particle gets its own copy of the sprite, so a system can change one
particle's `tintColor` or `opacityMultiplier` without changing any other
particle from the same emitter. Changing the emitter's `sprite` afterwards
only affects particles spawned from then on.
