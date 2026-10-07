import { describe, expect, it } from 'vitest';
import { findOwningCanvas } from './find-owning-canvas.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addCameraComponent } from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';

const createCanvasEntity = (world: EcsWorld): number => {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera);

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  return canvas;
};

describe('findOwningCanvas', () => {
  it('returns the entity itself when it is a canvas', () => {
    const world = new EcsWorld();
    const canvas = createCanvasEntity(world);

    expect(findOwningCanvas(world, canvas)).toBe(canvas);
  });

  it('walks up the parent chain to find the owning canvas', () => {
    const world = new EcsWorld();
    const canvas = createCanvasEntity(world);

    const panel = world.createEntity();
    world.setParent(panel, canvas);

    const label = world.createEntity();
    world.setParent(label, panel);

    expect(findOwningCanvas(world, panel)).toBe(canvas);
    expect(findOwningCanvas(world, label)).toBe(canvas);
  });

  it('returns null when the entity is not parented to a canvas', () => {
    const world = new EcsWorld();
    const orphan = world.createEntity();

    expect(findOwningCanvas(world, orphan)).toBeNull();
  });
});
