import { describe, expect, it } from 'vitest';
import { addLifetimeComponent, lifetimeId } from './lifetime-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addLifetimeComponent', () => {
  it('attaches a component with default elapsedSeconds and hasExpired', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, { durationSeconds: 5 });

    expect(world.getComponent(entity, lifetimeId)).toEqual({
      elapsedSeconds: 0,
      durationSeconds: 5,
      hasExpired: false,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      durationSeconds: 5,
      elapsedSeconds: 2,
    });

    expect(world.getComponent(entity, lifetimeId)).toEqual({
      elapsedSeconds: 2,
      durationSeconds: 5,
      hasExpired: false,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLifetimeComponent(world, entity, {
      durationSeconds: 3,
      hasExpired: true,
    });

    expect(component).toEqual({
      elapsedSeconds: 0,
      durationSeconds: 3,
      hasExpired: true,
    });
    expect(world.getComponent(entity, lifetimeId)).toBe(component);
  });
});
