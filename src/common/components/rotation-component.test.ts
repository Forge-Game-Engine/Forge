import { describe, expect, it } from 'vitest';
import { addRotationComponent, rotationId } from './rotation-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addRotationComponent', () => {
  it('attaches a component with default local and world angles', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRotationComponent(world, entity);

    expect(world.getComponent(entity, rotationId)).toEqual({
      local: 0,
      world: 0,
    });
  });

  it('starts the world angle equal to the local angle', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRotationComponent(world, entity, { local: Math.PI });

    expect(world.getComponent(entity, rotationId)).toEqual({
      local: Math.PI,
      world: Math.PI,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addRotationComponent(world, entity, { local: 1 });

    expect(component).toEqual({ local: 1, world: 1 });
    expect(world.getComponent(entity, rotationId)).toBe(component);
  });
});
