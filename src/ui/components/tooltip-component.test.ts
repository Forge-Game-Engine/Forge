import { describe, expect, it } from 'vitest';
import { addTooltipComponent, tooltipId } from './tooltip-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addTooltipComponent', () => {
  it('defaults showDelayMilliseconds and hoverElapsedMilliseconds', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const panel = world.createEntity();
    const label = world.createEntity();

    const component = addTooltipComponent(world, entity, { panel, label });

    expect(component.panel).toBe(panel);
    expect(component.label).toBe(label);
    expect(component.showDelayMilliseconds).toBe(400);
    expect(component.hoverElapsedMilliseconds).toBe(0);
    expect(world.getComponent(entity, tooltipId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const panel = world.createEntity();
    const label = world.createEntity();

    const component = addTooltipComponent(world, entity, {
      panel,
      label,
      showDelayMilliseconds: 1000,
    });

    expect(component.showDelayMilliseconds).toBe(1000);
  });
});
