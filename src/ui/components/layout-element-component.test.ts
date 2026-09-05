import { describe, expect, it } from 'vitest';
import {
  addLayoutElementComponent,
  layoutElementId,
} from './layout-element-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addLayoutElementComponent', () => {
  it('defaults ignoreLayout to false and leaves size fields undefined', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLayoutElementComponent(world, entity);

    expect(component.ignoreLayout).toBe(false);
    expect(component.minWidth).toBeUndefined();
    expect(component.minHeight).toBeUndefined();
    expect(component.preferredWidth).toBeUndefined();
    expect(component.preferredHeight).toBeUndefined();
    expect(component.flexibleWidth).toBeUndefined();
    expect(component.flexibleHeight).toBeUndefined();
    expect(component.sizeToText).toBeUndefined();
    expect(world.getComponent(entity, layoutElementId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLayoutElementComponent(world, entity, {
      ignoreLayout: true,
      minWidth: 10,
      minHeight: 20,
      preferredWidth: 100,
      preferredHeight: 50,
      flexibleWidth: 1,
      flexibleHeight: 2,
      sizeToText: true,
    });

    expect(component.ignoreLayout).toBe(true);
    expect(component.minWidth).toBe(10);
    expect(component.minHeight).toBe(20);
    expect(component.preferredWidth).toBe(100);
    expect(component.preferredHeight).toBe(50);
    expect(component.flexibleWidth).toBe(1);
    expect(component.flexibleHeight).toBe(2);
    expect(component.sizeToText).toBe(true);
  });
});
