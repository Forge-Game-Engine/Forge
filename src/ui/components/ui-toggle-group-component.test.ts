import { describe, expect, it } from 'vitest';
import {
  addUiToggleGroupComponent,
  uiToggleGroupId,
} from './ui-toggle-group-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiToggleGroupComponent', () => {
  it('defaults allowSwitchOff to false', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiToggleGroupComponent(world, entity);

    expect(component.allowSwitchOff).toBe(false);
    expect(world.getComponent(entity, uiToggleGroupId)).toBe(component);
  });

  it('accepts an allowSwitchOff override', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiToggleGroupComponent(world, entity, {
      allowSwitchOff: true,
    });

    expect(component.allowSwitchOff).toBe(true);
  });
});
