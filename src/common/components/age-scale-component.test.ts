import { describe, expect, it } from 'vitest';
import { addAgeScaleComponent, ageScaleId } from './age-scale-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addAgeScaleComponent', () => {
  it('attaches a component with default scale values', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAgeScaleComponent(world, entity);

    expect(world.getComponent(entity, ageScaleId)).toEqual({
      originalScaleX: 1,
      originalScaleY: 1,
      finalLifetimeScaleX: 1,
      finalLifetimeScaleY: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAgeScaleComponent(world, entity, {
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0,
    });

    expect(world.getComponent(entity, ageScaleId)).toEqual({
      originalScaleX: 1,
      originalScaleY: 1,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAgeScaleComponent(world, entity, {
      originalScaleX: 2,
      originalScaleY: 2,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0,
    });

    expect(component).toEqual({
      originalScaleX: 2,
      originalScaleY: 2,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0,
    });
    expect(world.getComponent(entity, ageScaleId)).toBe(component);
  });
});
