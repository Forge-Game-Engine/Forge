import { describe, expect, it } from 'vitest';
import {
  addUiDropdownComponent,
  uiDropdownId,
} from './ui-dropdown-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiDropdownComponent', () => {
  it('defaults selectedIndex to 0 and starts closed', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiDropdownComponent(world, entity, {
      options: ['Low', 'Medium', 'High'],
    });

    expect(component.selectedIndex).toBe(0);
    expect(component.isOpen).toBe(false);
    expect(component.options).toEqual(['Low', 'Medium', 'High']);
    expect(world.getComponent(entity, uiDropdownId)).toBe(component);
  });

  it('accepts a selectedIndex override', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiDropdownComponent(world, entity, {
      options: ['Low', 'Medium', 'High'],
      selectedIndex: 2,
    });

    expect(component.selectedIndex).toBe(2);
  });

  it('throws when options is empty', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addUiDropdownComponent(world, entity, { options: [] }),
    ).toThrow();
  });

  it('throws when selectedIndex is out of bounds', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addUiDropdownComponent(world, entity, {
        options: ['Low', 'Medium'],
        selectedIndex: 5,
      }),
    ).toThrow();
  });

  it('raises onValueChanged with the new index', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiDropdownComponent(world, entity, {
      options: ['Low', 'Medium', 'High'],
    });
    const values: number[] = [];
    component.onValueChanged.registerListener((value) => values.push(value));

    component.onValueChanged.raise(2);

    expect(values).toEqual([2]);
  });
});
