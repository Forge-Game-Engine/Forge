import { describe, expect, it } from 'vitest';
import { addBloomComponent, bloomId } from './bloom-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addBloomComponent', () => {
  it('attaches a component with default threshold, passes, and intensity', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addBloomComponent(world, cameraEntity);

    expect(world.getComponent(cameraEntity, bloomId)).toEqual({
      threshold: 0.8,
      passes: 4,
      intensity: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addBloomComponent(world, cameraEntity, { intensity: 0.5 });

    expect(world.getComponent(cameraEntity, bloomId)).toEqual({
      threshold: 0.8,
      passes: 4,
      intensity: 0.5,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    const component = addBloomComponent(world, cameraEntity, {
      threshold: 0.6,
      passes: 8,
      intensity: 1.2,
    });

    expect(component).toEqual({ threshold: 0.6, passes: 8, intensity: 1.2 });
    expect(world.getComponent(cameraEntity, bloomId)).toBe(component);
  });
});
