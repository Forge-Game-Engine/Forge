/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiCanvas } from './create-ui-canvas.js';
import {
  addParentComponent,
  addPositionComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  Axis2dAction,
  MouseInputSource,
  TriggerAction,
} from '../../input/index.js';
import { cameraId, Color, RenderContext } from '../../rendering/index.js';
import { canvasId } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const buildMouseInputSource = (x = 0, y = 0): MouseInputSource =>
  ({
    position: { x, y },
    buttonsDown: new Set(),
    buttonsUp: new Set(),
  }) as unknown as MouseInputSource;

const testCullingMask = 0b0001;

describe('createUiCanvas', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    gl = {
      createFramebuffer: vi.fn().mockReturnValue({}),
      createTexture: vi.fn().mockReturnValue({}),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),
      getExtension: vi.fn().mockReturnValue({}),
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
    time = new Time();
  });

  it('creates a canvas entity wired to a dedicated, static, transparent UI camera', () => {
    const canvas = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
    });

    const canvasComponent = world.getComponent(canvas, canvasId)!;
    const rectTransform = world.getComponent(canvas, rectTransformId);
    const camera = world.getComponent(canvasComponent.camera, cameraId)!;

    expect(rectTransform).not.toBeNull();
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
    const canvas = createUiCanvas(world, renderContext, time, {
      referenceResolution: { x: 1280, y: 720 },
      cullingMask: 0b0010,
      layer: 5,
    });

    const canvasComponent = world.getComponent(canvas, canvasId)!;
    const camera = world.getComponent(canvasComponent.camera, cameraId)!;

    expect(canvasComponent.referenceResolution).toEqual({ x: 1280, y: 720 });
    expect(camera.cullingMask).toBe(0b0010);
    expect(camera.layer).toBe(5);
    expect(camera.verticalWorldUnits).toBe(720);
  });

  it('registers the UI layout system once, resolving multiple canvases in a single update', () => {
    const canvasA = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
    });
    const canvasB = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
      referenceResolution: { x: 1280, y: 720 },
    });

    world.update();

    expect(world.getComponent(canvasA, rectTransformId)!.rect).toEqual({
      min: { x: -960, y: -540 },
      max: { x: 960, y: 540 },
    });
    expect(world.getComponent(canvasB, rectTransformId)!.rect).toEqual({
      min: { x: -640, y: -360 },
      max: { x: 640, y: 360 },
    });
  });

  const createButtonEntity = (canvas: number): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(world, entity, {
      ...UiAnchor.center,
      sizeDelta: { x: 300, y: 150 },
    });
    addUiInteractableComponent(world, entity);

    return entity;
  };

  it('does not hit-test or receive pointer interaction without a pointerSource', () => {
    const canvas = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
    });
    const button = createButtonEntity(canvas);

    world.update();

    expect(world.getComponent(canvas, canvasId)!.hoveredEntity).toBeNull();
    expect(world.getComponent(button, uiInteractableId)!.isHovered).toBe(false);
  });

  it('wires pointer raycasting and interaction once a pointerSource is supplied', () => {
    const mouseInputSource = buildMouseInputSource(960, 540);
    const canvas = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
      pointerSource: mouseInputSource,
    });
    const button = createButtonEntity(canvas);

    world.update();

    expect(world.getComponent(canvas, canvasId)!.hoveredEntity).toBe(button);
    expect(world.getComponent(button, uiInteractableId)!.isHovered).toBe(true);
  });

  it('passes submitInput/cancelInput/navigateInput through to the canvas component', () => {
    const submitInput = new TriggerAction('ui-submit');
    const cancelInput = new TriggerAction('ui-cancel');
    const navigateInput = new Axis2dAction('ui-navigate');

    const canvas = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
      submitInput,
      cancelInput,
      navigateInput,
    });

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.submitInput).toBe(submitInput);
    expect(canvasComponent.cancelInput).toBe(cancelInput);
    expect(canvasComponent.navigateInput).toBe(navigateInput);
  });

  it('resets wasInvokedThisFrame every tick via the always-registered navigation system', () => {
    const canvas = createUiCanvas(world, renderContext, time, {
      cullingMask: testCullingMask,
    });
    const button = createButtonEntity(canvas);
    const interactable = world.getComponent(button, uiInteractableId)!;

    interactable.wasInvokedThisFrame = true;

    world.update();

    expect(interactable.wasInvokedThisFrame).toBe(false);
  });
});
