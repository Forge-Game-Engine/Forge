import { describe, expect, it } from 'vitest';
import { createCamera } from './create-camera.js';
import { EcsWorld } from '../../ecs/index.js';
import { positionId } from '../../common/index.js';
import { cameraId } from '../components/index.js';

describe('createCamera', () => {
  it('returns a new entity carrying camera and position components', () => {
    const world = new EcsWorld();

    const cameraEntity = createCamera(world);

    expect(world.getComponent(cameraEntity, cameraId)).not.toBeNull();
    expect(world.getComponent(cameraEntity, positionId)).not.toBeNull();
  });

  it('applies defaults for unspecified options', () => {
    const world = new EcsWorld();

    const cameraEntity = createCamera(world);

    expect(world.getComponent(cameraEntity, cameraId)).toMatchObject({
      zoom: 1,
      isStatic: false,
      cullingMask: 0xffffffff,
      layer: 0,
    });
  });

  it('applies the provided options', () => {
    const world = new EcsWorld();

    const cameraEntity = createCamera(world, {
      zoom: 2,
      isStatic: true,
      layer: 2,
    });

    expect(world.getComponent(cameraEntity, cameraId)).toMatchObject({
      zoom: 2,
      isStatic: true,
      layer: 2,
    });
  });

  it('returns distinct entities for multiple cameras', () => {
    const world = new EcsWorld();

    const first = createCamera(world);
    const second = createCamera(world);

    expect(first).not.toBe(second);
  });
});
