import { describe, expect, it } from 'vitest';
import {
  addGaussianBlurComponent,
  gaussianBlurId,
} from './gaussian-blur-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addGaussianBlurComponent', () => {
  it('attaches a component with default passes and intensity', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addGaussianBlurComponent(world, cameraEntity);

    expect(world.getComponent(cameraEntity, gaussianBlurId)).toEqual({
      passes: 4,
      intensity: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addGaussianBlurComponent(world, cameraEntity, { intensity: 0.5 });

    expect(world.getComponent(cameraEntity, gaussianBlurId)).toEqual({
      passes: 4,
      intensity: 0.5,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    const component = addGaussianBlurComponent(world, cameraEntity, {
      passes: 8,
      intensity: 0.2,
    });

    expect(component).toEqual({ passes: 8, intensity: 0.2 });
    expect(world.getComponent(cameraEntity, gaussianBlurId)).toBe(component);
  });
});
