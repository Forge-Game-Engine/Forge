/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it } from 'vitest';
import { createUiCanvas } from './create-ui-canvas.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import {
  addCameraComponent,
  cameraId,
  Color,
  RenderContext,
} from '../../rendering/index.js';
import { canvasId } from '../components/canvas-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
import { uiScaleModes } from '../types/ui-scale-mode.js';

const testCullingMask = 0b0001;

describe('createUiCanvas', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  beforeEach(() => {
    gl = {
      createFramebuffer: () => ({}),
      createTexture: () => ({}),
      bindTexture: () => undefined,
      texParameteri: () => undefined,
      texImage2D: () => undefined,
      bindFramebuffer: () => undefined,
      framebufferTexture2D: () => undefined,
      checkFramebufferStatus: () => 1,
      getParameter: () => null,
      deleteFramebuffer: () => undefined,
      deleteTexture: () => undefined,
      getExtension: () => ({}),
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',
    } as unknown as WebGL2RenderingContext;

    renderContext = { width: 1920, height: 1080, gl } as RenderContext;
    world = new EcsWorld();
  });

  it('creates a canvas entity wired to a dedicated, static, transparent UI camera', () => {
    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });

    const canvasComponent = world.getComponentRequired(canvas, canvasId);
    const rectTransform = world.getComponent(canvas, rectTransformId);
    const camera = world.getComponentRequired(canvasComponent.camera, cameraId);

    expect(rectTransform).not.toBeNull();

    if (canvasComponent.renderMode !== uiCanvasRenderModes.screenSpace) {
      throw new Error('expected a screenSpace canvas');
    }

    expect(canvasComponent.referenceResolution).toEqual({ x: 1920, y: 1080 });
    expect(camera.isStatic).toBe(true);
    expect(camera.clearColor).toEqual(Color.transparent);
    expect(camera.cullingMask).toBe(testCullingMask);
    expect(camera.layer).toBe(1000);
    expect(camera.verticalWorldUnits).toBe(1080);
    expect(camera.renderTarget).toBeDefined();
    expect(camera.renderTarget?.width).toBe(1920);
    expect(camera.renderTarget?.height).toBe(1080);
  });

  it('honors overrides for referenceResolution, scaleMode, cullingMask, and layer', () => {
    const canvas = createUiCanvas(world, renderContext, {
      referenceResolution: { x: 1280, y: 720 },
      scaleMode: uiScaleModes.constantPixelSize,
      cullingMask: 0b0010,
      layer: 5,
    });

    const canvasComponent = world.getComponentRequired(canvas, canvasId);
    const camera = world.getComponentRequired(canvasComponent.camera, cameraId);

    if (canvasComponent.renderMode !== uiCanvasRenderModes.screenSpace) {
      throw new Error('expected a screenSpace canvas');
    }

    expect(canvasComponent.referenceResolution).toEqual({ x: 1280, y: 720 });
    expect(canvasComponent.scaleMode).toBe(uiScaleModes.constantPixelSize);
    expect(camera.cullingMask).toBe(0b0010);
    expect(camera.layer).toBe(5);
    expect(camera.verticalWorldUnits).toBe(720);
  });

  it('passes submitInput/cancelInput/navigateInput through to the canvas component', () => {
    const submitInput = new TriggerAction('ui-submit');
    const cancelInput = new TriggerAction('ui-cancel');
    const navigateInput = new Axis2dAction('ui-navigate');

    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
      submitInput,
      cancelInput,
      navigateInput,
    });

    const canvasComponent = world.getComponentRequired(canvas, canvasId);

    expect(canvasComponent.submitInput).toBe(submitInput);
    expect(canvasComponent.cancelInput).toBe(cancelInput);
    expect(canvasComponent.navigateInput).toBe(navigateInput);
  });

  it('draws a worldSpace canvas through the given camera instead of creating one', () => {
    const worldCamera = world.createEntity();

    addPositionComponent(world, worldCamera);
    addCameraComponent(world, worldCamera, { cullingMask: testCullingMask });

    const canvas = createUiCanvas(world, renderContext, {
      renderMode: uiCanvasRenderModes.worldSpace,
      camera: worldCamera,
    });

    const canvasComponent = world.getComponentRequired(canvas, canvasId);

    expect(canvasComponent.camera).toBe(worldCamera);
    expect(canvasComponent.renderMode).toBe(uiCanvasRenderModes.worldSpace);
  });

  it('places a worldSpace canvas root at the given anchor/anchoredPosition', () => {
    const worldCamera = world.createEntity();

    addPositionComponent(world, worldCamera);
    addCameraComponent(world, worldCamera, { cullingMask: testCullingMask });

    const canvas = createUiCanvas(world, renderContext, {
      renderMode: uiCanvasRenderModes.worldSpace,
      camera: worldCamera,
      anchor: UiAnchor.center({ x: 4, y: 1 }),
      anchoredPosition: { x: 10, y: -5 },
    });

    const rectTransform = world.getComponentRequired(canvas, rectTransformId);

    expect(rectTransform.anchoredPosition).toEqual({ x: 10, y: -5 });
    expect(rectTransform.x.kind).toBe('point');
    expect(rectTransform.x.kind === 'point' && rectTransform.x.size).toBe(4);
  });

  it('passes submitInput/cancelInput/navigateInput through to a worldSpace canvas component', () => {
    const worldCamera = world.createEntity();

    addPositionComponent(world, worldCamera);
    addCameraComponent(world, worldCamera, { cullingMask: testCullingMask });

    const submitInput = new TriggerAction('ui-submit');
    const cancelInput = new TriggerAction('ui-cancel');
    const navigateInput = new Axis2dAction('ui-navigate');

    const canvas = createUiCanvas(world, renderContext, {
      renderMode: uiCanvasRenderModes.worldSpace,
      camera: worldCamera,
      submitInput,
      cancelInput,
      navigateInput,
    });

    const canvasComponent = world.getComponentRequired(canvas, canvasId);

    expect(canvasComponent.submitInput).toBe(submitInput);
    expect(canvasComponent.cancelInput).toBe(cancelInput);
    expect(canvasComponent.navigateInput).toBe(navigateInput);
  });
});
