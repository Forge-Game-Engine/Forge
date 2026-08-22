import { describe, expect, it } from 'vitest';
import { addUiToggleComponent, uiToggleId } from './ui-toggle-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiToggleComponent', () => {
  it('defaults isOn to false and leaves group unset', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiToggleComponent(world, entity);

    expect(component.isOn).toBe(false);
    expect(component.group).toBeUndefined();
    expect(world.getComponent(entity, uiToggleId)).toBe(component);
  });

  it('accepts isOn and group overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const group = world.createEntity();

    const component = addUiToggleComponent(world, entity, {
      isOn: true,
      group,
    });

    expect(component.isOn).toBe(true);
    expect(component.group).toBe(group);
  });

  it('raises onValueChanged with the new value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiToggleComponent(world, entity);
    const values: boolean[] = [];
    component.onValueChanged.registerListener((value) => values.push(value));

    component.onValueChanged.raise(true);

    expect(values).toEqual([true]);
  });
});
