import { describe, expect, it } from 'vitest';
import { addCamera } from './add-camera';
import { EcsWorld } from '../../ecs/index.js';
import { positionId } from '../../common/index.js';
import { cameraId } from '../components/index.js';

describe('addCamera', () => {
  it('returns the created camera entity', () => {
    const world = new EcsWorld();

    const cameraEntity = addCamera(world);

    expect(world.getComponent(cameraEntity, cameraId)).not.toBeNull();
    expect(world.getComponent(cameraEntity, positionId)).not.toBeNull();
  });

  it('applies defaults for unspecified options', () => {
    const world = new EcsWorld();

    const cameraEntity = addCamera(world);

    expect(world.getComponent(cameraEntity, cameraId)).toMatchObject({
      zoom: 1,
      isStatic: false,
      cullingMask: 0xffffffff,
    });
  });

  it('applies the provided options', () => {
    const world = new EcsWorld();

    const cameraEntity = addCamera(world, { zoom: 2, isStatic: true });

    expect(world.getComponent(cameraEntity, cameraId)).toMatchObject({
      zoom: 2,
      isStatic: true,
    });
  });

  it('returns distinct entities for multiple cameras', () => {
    const world = new EcsWorld();

    const first = addCamera(world);
    const second = addCamera(world);

    expect(first).not.toBe(second);
  });
});
