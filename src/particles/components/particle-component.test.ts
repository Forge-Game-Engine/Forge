import { describe, expect, it } from 'vitest';
import { addParticleComponent, ParticleId } from './particle-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addParticleComponent', () => {
  it('attaches a component with default rotationSpeed', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addParticleComponent(world, entity);

    expect(world.getComponent(entity, ParticleId)).toEqual({
      rotationSpeed: 0,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addParticleComponent(world, entity, { rotationSpeed: 2 });

    expect(world.getComponent(entity, ParticleId)).toEqual({
      rotationSpeed: 2,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addParticleComponent(world, entity, { rotationSpeed: 4 });

    expect(component).toEqual({ rotationSpeed: 4 });
    expect(world.getComponent(entity, ParticleId)).toBe(component);
  });
});
