import { describe, expect, it } from 'vitest';
import { addGaussianBlur } from './add-gaussian-blur';
import { EcsWorld } from '../../ecs/index.js';
import { gaussianBlurId } from '../components/index.js';

describe('addGaussianBlur', () => {
  it('attaches a component with default passes and intensity', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addGaussianBlur(world, cameraEntity);

    expect(world.getComponent(cameraEntity, gaussianBlurId)).toEqual({
      passes: 4,
      intensity: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addGaussianBlur(world, cameraEntity, { intensity: 0.5 });

    expect(world.getComponent(cameraEntity, gaussianBlurId)).toEqual({
      passes: 4,
      intensity: 0.5,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    const component = addGaussianBlur(world, cameraEntity, {
      passes: 8,
      intensity: 0.2,
    });

    expect(component).toEqual({ passes: 8, intensity: 0.2 });
    expect(world.getComponent(cameraEntity, gaussianBlurId)).toBe(component);
  });
});
