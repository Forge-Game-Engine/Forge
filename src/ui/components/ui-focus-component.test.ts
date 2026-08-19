import { describe, expect, it } from 'vitest';
import { addUiFocusComponent, uiFocusId } from './ui-focus-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiFocusComponent', () => {
  it('attaches an empty component when no overrides are given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiFocusComponent(world, entity);

    expect(component).toEqual({});
    expect(world.getComponent(entity, uiFocusId)).toBe(component);
  });

  it('attaches only the provided directional overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const upTarget = world.createEntity();
    const rightTarget = world.createEntity();

    const component = addUiFocusComponent(world, entity, {
      up: upTarget,
      right: rightTarget,
    });

    expect(component.up).toBe(upTarget);
    expect(component.right).toBe(rightTarget);
    expect(component.down).toBeUndefined();
    expect(component.left).toBeUndefined();
  });
});
