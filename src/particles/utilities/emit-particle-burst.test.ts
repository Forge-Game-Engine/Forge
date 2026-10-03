import { describe, expect, it } from 'vitest';
import { emitParticleBurst } from './emit-particle-burst.js';
import { EcsWorld } from '../../ecs/index.js';
import { ParticleEmitter, ParticleId } from '../components/index.js';
import { positionId } from '../../common/index.js';
import { Random, Vec2 } from '../../math/index.js';
import { Renderable } from '../../rendering/index.js';

const sprite = { width: 1, height: 1, renderable: {} as Renderable };

describe('emitParticleBurst', () => {
  it('spawns a count from numParticlesRange around the given position, without an emitter entity', () => {
    const world = new EcsWorld();
    const emitter = new ParticleEmitter(sprite, {
      numParticlesRange: { min: 4, max: 4 },
    });

    const particles = emitParticleBurst(
      world,
      emitter,
      { x: 3, y: 7 },
      new Random('burst-seed'),
    );

    expect(particles).toHaveLength(4);
    expect(world.query([ParticleId]).entities).toEqual(particles);

    for (const particle of particles) {
      expect(world.getComponentRequired(particle, positionId).world).toEqual({
        x: 3,
        y: 7,
      });
    }

    expect(emitter.emitCount).toBe(0);
  });

  it('spawns the given count when one is passed', () => {
    const world = new EcsWorld();
    const emitter = new ParticleEmitter(sprite);

    const particles = emitParticleBurst(
      world,
      emitter,
      Vec2.zero,
      new Random('burst-seed'),
      { count: 28 },
    );

    expect(particles).toHaveLength(28);
  });

  it('aims particles away from the center of the spawn shape when emitOutward is set', () => {
    const world = new EcsWorld();
    const emitter = new ParticleEmitter(sprite, {
      spawnShape: { type: 'ring', radius: 2 },
      emitOutward: true,
      speedRange: { min: 3, max: 3 },
      directionRange: { min: 0, max: 0 },
    });
    const origin = { x: 10, y: -4 };

    const particles = emitParticleBurst(
      world,
      emitter,
      origin,
      new Random('outward-seed'),
      { count: 20 },
    );

    for (const particle of particles) {
      const position = world.getComponentRequired(particle, positionId).world;
      const { velocity } = world.getComponentRequired(particle, ParticleId);
      const offset = Vec2.subtract(Vec2.clone(position), origin);

      expect(Vec2.magnitude(offset)).toBeCloseTo(2);
      expect(Vec2.magnitude(velocity)).toBeCloseTo(3);
      expect(velocity.x).toBeCloseTo((offset.x / 2) * 3);
      expect(velocity.y).toBeCloseTo((offset.y / 2) * 3);
    }
  });
});
