/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiCanvas, defaultUiRenderCategory } from './create-ui-canvas.js';
import { EcsWorld } from '../../ecs/index.js';
import { cameraId, Color, RenderContext } from '../../rendering/index.js';
import { canvasId } from '../components/canvas-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';

describe('createUiCanvas', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

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
  });

  it('creates a canvas entity wired to a dedicated, static, transparent UI camera', () => {
    const canvas = createUiCanvas(world, renderContext);

    const canvasComponent = world.getComponent(canvas, canvasId)!;
    const rectTransform = world.getComponent(canvas, rectTransformId);
    const camera = world.getComponent(canvasComponent.camera, cameraId)!;

    expect(rectTransform).not.toBeNull();
    expect(canvasComponent.referenceResolution).toEqual({ x: 1920, y: 1080 });
    expect(camera.isStatic).toBe(true);
    expect(camera.clearColor).toEqual(Color.transparent);
    expect(camera.cullingMask).toBe(defaultUiRenderCategory);
    expect(camera.layer).toBe(1000);
    expect(camera.verticalWorldUnits).toBe(1080);
    expect(camera.renderTarget).toBeDefined();
    expect(camera.renderTarget?.width).toBe(1920);
    expect(camera.renderTarget?.height).toBe(1080);
  });

  it('honors overrides for referenceResolution, scaleMode, cullingMask, and layer', () => {
    const canvas = createUiCanvas(world, renderContext, {
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
    const canvasA = createUiCanvas(world, renderContext);
    const canvasB = createUiCanvas(world, renderContext, {
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
});
