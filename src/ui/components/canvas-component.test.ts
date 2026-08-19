import { describe, expect, it } from 'vitest';
import { addCanvasComponent, canvasId } from './canvas-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { uiScaleModes } from '../types/ui-scale-mode.js';

describe('addCanvasComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const cameraEntity = world.createEntity();

    const component = addCanvasComponent(world, entity, {
      camera: cameraEntity,
    });

    expect(world.getComponent(entity, canvasId)).toEqual({
      camera: cameraEntity,
      referenceResolution: { x: 1920, y: 1080 },
      scaleMode: uiScaleModes.scaleWithScreenSize,
    });
    expect(world.getComponent(entity, canvasId)).toBe(component);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const cameraEntity = world.createEntity();

    const component = addCanvasComponent(world, entity, {
      camera: cameraEntity,
      scaleMode: uiScaleModes.matchWidth,
    });

    expect(component.scaleMode).toBe(uiScaleModes.matchWidth);
    expect(component.referenceResolution).toEqual({ x: 1920, y: 1080 });
  });
});
