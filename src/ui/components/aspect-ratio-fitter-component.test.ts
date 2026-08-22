import { describe, expect, it } from 'vitest';
import {
  addAspectRatioFitterComponent,
  aspectRatioFitterId,
} from './aspect-ratio-fitter-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addAspectRatioFitterComponent', () => {
  it('defaults aspectMode and aspectRatio', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAspectRatioFitterComponent(world, entity);

    expect(component.aspectMode).toBe('widthControlsHeight');
    expect(component.aspectRatio).toBe(1);
    expect(world.getComponent(entity, aspectRatioFitterId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'fitInParent',
      aspectRatio: 16 / 9,
    });

    expect(component.aspectMode).toBe('fitInParent');
    expect(component.aspectRatio).toBeCloseTo(16 / 9);
  });
});
