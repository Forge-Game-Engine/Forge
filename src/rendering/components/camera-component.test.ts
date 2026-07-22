import { describe, expect, it } from 'vitest';
import { addCameraComponent, cameraId } from './camera-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../color.js';

describe('addCameraComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addCameraComponent(world, entity);

    expect(world.getComponent(entity, cameraId)).toEqual({
      zoom: 1,
      zoomSensitivity: 0.1,
      panSensitivity: 1,
      minZoom: 0.1,
      maxZoom: 10,
      isStatic: false,
      cullingMask: 0xffffffff,
      layer: 0,
      clearColor: new Color(0.6, 0.6, 0.8),
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addCameraComponent(world, entity, { zoom: 2, isStatic: true, layer: 2 });

    expect(world.getComponent(entity, cameraId)).toMatchObject({
      zoom: 2,
      isStatic: true,
      layer: 2,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addCameraComponent(world, entity);

    expect(world.getComponent(entity, cameraId)).toBe(component);
  });
});
