import { describe, expect, it } from 'vitest';
import {
  addUiWorldSpaceFollowComponent,
  uiWorldSpaceFollowId,
} from './ui-world-space-follow-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiWorldSpaceFollowComponent', () => {
  it('attaches a component with the given target', () => {
    const world = new EcsWorld();
    const target = world.createEntity();
    const entity = world.createEntity();

    addUiWorldSpaceFollowComponent(world, entity, { target });

    expect(world.getComponent(entity, uiWorldSpaceFollowId)).toEqual({
      target,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const target = world.createEntity();
    const entity = world.createEntity();

    const component = addUiWorldSpaceFollowComponent(world, entity, {
      target,
    });

    expect(component).toEqual({ target });
    expect(world.getComponent(entity, uiWorldSpaceFollowId)).toBe(component);
  });
});
