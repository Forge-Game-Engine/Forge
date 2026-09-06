import { describe, expect, it } from 'vitest';
import {
  addUiSafeAreaComponent,
  uiSafeAreaId,
} from './ui-safe-area-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiSafeAreaComponent', () => {
  it('defaults every edge to true', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiSafeAreaComponent(world, entity);

    expect(component).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: true,
    });
    expect(world.getComponent(entity, uiSafeAreaId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiSafeAreaComponent(world, entity, {
      bottom: false,
    });

    expect(component.bottom).toBe(false);
    expect(component.top).toBe(true);
  });
});
