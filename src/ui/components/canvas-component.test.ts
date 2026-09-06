import { describe, expect, it } from 'vitest';
import { addCanvasComponent, canvasId } from './canvas-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
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
      renderMode: uiCanvasRenderModes.screenSpace,
      referenceResolution: { x: 1920, y: 1080 },
      scaleMode: uiScaleModes.scaleWithScreenSize,
      isPointerOverUi: false,
      hoveredEntity: null,
      focusedEntity: null,
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

  it('accepts renderMode: worldSpace', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const cameraEntity = world.createEntity();

    const component = addCanvasComponent(world, entity, {
      camera: cameraEntity,
      renderMode: uiCanvasRenderModes.worldSpace,
    });

    expect(component.renderMode).toBe(uiCanvasRenderModes.worldSpace);
  });

  it('accepts optional submitInput/cancelInput/navigateInput', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const cameraEntity = world.createEntity();

    const submitInput = new TriggerAction('ui-submit');
    const cancelInput = new TriggerAction('ui-cancel');
    const navigateInput = new Axis2dAction('ui-navigate');

    const component = addCanvasComponent(world, entity, {
      camera: cameraEntity,
      submitInput,
      cancelInput,
      navigateInput,
    });

    expect(component.submitInput).toBe(submitInput);
    expect(component.cancelInput).toBe(cancelInput);
    expect(component.navigateInput).toBe(navigateInput);
  });
});
