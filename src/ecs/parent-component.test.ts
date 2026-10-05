import { describe, expect, it } from 'vitest';
import { addParentComponent, parentId } from './parent-component.js';
import { EcsWorld } from './ecs-world.js';

describe('addParentComponent', () => {
  it('attaches a component with the given parent', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const entity = world.createEntity();

    addParentComponent(world, entity, { parent });

    expect(world.getComponent(entity, parentId)).toEqual({ parent });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const entity = world.createEntity();

    const component = addParentComponent(world, entity, { parent });

    expect(component).toEqual({ parent });
    expect(world.getComponent(entity, parentId)).toBe(component);
  });

  it('replaces the existing parent when added again', () => {
    const world = new EcsWorld();
    const oldParent = world.createEntity();
    const newParent = world.createEntity();
    const entity = world.createEntity();
    addParentComponent(world, entity, { parent: oldParent });

    addParentComponent(world, entity, { parent: newParent });

    expect(world.getComponent(entity, parentId)).toEqual({
      parent: newParent,
    });
  });
});
