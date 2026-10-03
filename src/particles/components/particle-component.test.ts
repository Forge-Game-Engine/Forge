import { describe, expect, it } from 'vitest';
import { addParticleComponent, ParticleId } from './particle-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addParticleComponent', () => {
  it('attaches a component with defaults that leave the particle at rest', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addParticleComponent(world, entity);

    expect(world.getComponent(entity, ParticleId)).toEqual({
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      drag: 1,
      rotationSpeed: 0,
      startOpacity: 1,
      endOpacity: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addParticleComponent(world, entity, { rotationSpeed: 2, drag: 0.5 });

    expect(world.getComponent(entity, ParticleId)).toMatchObject({
      rotationSpeed: 2,
      drag: 0.5,
      startOpacity: 1,
    });
  });

  it('gives each particle its own velocity and acceleration vectors', () => {
    const world = new EcsWorld();

    const first = addParticleComponent(world, world.createEntity());
    const second = addParticleComponent(world, world.createEntity());

    expect(first.velocity).not.toBe(second.velocity);
    expect(first.acceleration).not.toBe(second.acceleration);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addParticleComponent(world, entity, { rotationSpeed: 4 });

    expect(world.getComponent(entity, ParticleId)).toBe(component);
  });
});
