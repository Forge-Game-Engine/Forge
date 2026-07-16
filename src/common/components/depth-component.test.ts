import { describe, expect, it } from 'vitest';
import { addDepthComponent, depthId } from './depth-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addDepthComponent', () => {
  it('attaches a component with default depth and isDirty', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addDepthComponent(world, entity);

    expect(world.getComponent(entity, depthId)).toEqual({
      depth: 0,
      isDirty: false,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addDepthComponent(world, entity, { depth: 5 });

    expect(world.getComponent(entity, depthId)).toEqual({
      depth: 5,
      isDirty: false,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addDepthComponent(world, entity, {
      depth: 3,
      isDirty: true,
    });

    expect(component).toEqual({ depth: 3, isDirty: true });
    expect(world.getComponent(entity, depthId)).toBe(component);
  });
});
