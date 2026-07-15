import { describe, expect, it } from 'vitest';
import { addSpeedComponent, speedId } from './speed-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addSpeedComponent', () => {
  it('attaches a component with default speed', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSpeedComponent(world, entity);

    expect(world.getComponent(entity, speedId)).toEqual({ speed: 0 });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSpeedComponent(world, entity, { speed: 5 });

    expect(world.getComponent(entity, speedId)).toEqual({ speed: 5 });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addSpeedComponent(world, entity, { speed: 10 });

    expect(component).toEqual({ speed: 10 });
    expect(world.getComponent(entity, speedId)).toBe(component);
  });
});
