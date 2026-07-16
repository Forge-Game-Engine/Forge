import { describe, expect, it } from 'vitest';
import {
  addParticleEmitterComponent,
  ParticleEmitterId,
} from './particle-emitter-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addParticleEmitterComponent', () => {
  it('attaches a component with an empty emitters map by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addParticleEmitterComponent(world, entity);

    expect(world.getComponent(entity, ParticleEmitterId)).toEqual({
      emitters: new Map(),
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const emitters = new Map();

    addParticleEmitterComponent(world, entity, { emitters });

    expect(world.getComponent(entity, ParticleEmitterId)).toEqual({
      emitters,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addParticleEmitterComponent(world, entity);

    expect(world.getComponent(entity, ParticleEmitterId)).toBe(component);
  });

  it('gives each entity its own emitters map instance', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addParticleEmitterComponent(world, first);
    addParticleEmitterComponent(world, second);

    expect(world.getComponent(first, ParticleEmitterId)?.emitters).not.toBe(
      world.getComponent(second, ParticleEmitterId)?.emitters,
    );
  });
});
