# Particles

Forge's particle system spawns short-lived entities from a single
configuration object, [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter).
Each spawned particle is a regular entity built from the same components used
everywhere else in the engine, position, rotation, scale, speed, sprite,
lifetime, and age-scale, plus a
[`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent) that
marks it as a particle. Because particles are just entities, the existing
lifecycle and age-scale systems do the work of fading, shrinking, and
eventually removing them; the particle-specific systems only handle spawning
and per-particle movement.

Core concepts:

- [`ParticleEmitter`](/Forge/docs/api/classes/ParticleEmitter): describes how
  particles should look and behave when spawned, speed/scale/rotation/
  lifetime ranges, the sprite to use, and when to emit.
- [`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent)
  (`ParticleEmitterId`): attaches one or more named emitters to an entity.
- [`ParticleEcsComponent`](/Forge/docs/api/interfaces/ParticleEcsComponent)
  (`ParticleId`): marks an entity as a particle and stores its rotation
  speed.
- [`createParticleEcsSystem`](/Forge/docs/api/functions/createParticleEcsSystem):
  spawns particle entities from active emitters.
- [`createParticlePositionEcsSystem`](/Forge/docs/api/functions/createParticlePositionEcsSystem):
  moves and spins each particle every frame based on its speed and rotation.

Guides in this section:

- [Configuring Emitters](./emitters.md): ranges, bursts vs continuous
  emission, spawn positions, and running multiple emitters on one entity.

## Quick Start

A particle emitter lives on an entity inside a
[`ParticleEmitterEcsComponent`](/Forge/docs/api/interfaces/ParticleEmitterEcsComponent),
keyed by name so one entity can drive several effects (for example "attack"
and "footstep" emitters on a player). Spawning particles needs
`createParticleEcsSystem`, and moving them needs
`createParticlePositionEcsSystem`. Particles also rely on the lifecycle
systems to expire and remove themselves, and on `createAgeScaleEcsSystem` if
you want them to shrink (or grow) over their lifetime:

```ts
import { createAgeScaleEcsSystem } from '@forge-game-engine/forge/common';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random } from '@forge-game-engine/forge/math';
import {
  createParticleEcsSystem,
  createParticlePositionEcsSystem,
  ParticleEmitter,
  ParticleEmitterId,
} from '@forge-game-engine/forge/particles';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');
const random = new Random();

// sparkSprite is a Sprite created via the rendering module.
const sparks = new ParticleEmitter(sparkSprite, 0, {
  numParticlesRange: { min: 20, max: 30 },
  speedRange: { min: 100, max: 200 },
  scaleRange: { min: 0.4, max: 0.8 },
  lifetimeSecondsRange: { min: 0.3, max: 0.6 },
  lifetimeScaleReduction: 0,
  emitDurationSeconds: 0.2,
});

const emitterEntity = world.createEntity();

world.addComponent(emitterEntity, ParticleEmitterId, {
  emitters: new Map([['sparks', sparks]]),
});

world.addSystem(createParticleEcsSystem(time, random));
world.addSystem(createParticlePositionEcsSystem(time));
world.addSystem(createLifetimeTrackingEcsSystem(time));
world.addSystem(createAgeScaleEcsSystem());
world.addSystem(createRemoveFromWorldEcsSystem());

// trigger a burst of sparks, e.g. on impact
sparks.emitIfNotEmitting();
```

Each spawned particle removes itself from the world once its lifetime
expires, so there's nothing to clean up yourself.

:::caution
`renderLayer` on `ParticleEmitter` is for your own bookkeeping; the layer a
particle actually renders on comes from `sprite.renderable.layer`. Make sure
the sprite you pass to `ParticleEmitter` was created on the layer you want
particles to appear on.
:::
