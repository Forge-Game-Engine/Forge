/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresentEcsSystem } from './present-system';
import { EcsWorld } from '../../ecs';
import { CameraEcsComponent, cameraId } from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import {
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture =
  class WebGLTexture {} as unknown as typeof WebGLTexture;

describe('createPresentEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  const createCamera = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    layer: number = 0,
  ): CameraEcsComponent => ({
    zoom: 1,
    zoomSensitivity: 0.1,
    panSensitivity: 1,
    minZoom: 0.0001,
    maxZoom: 10000,
    isStatic: true,
    cullingMask: 0xffffffff,
    renderTarget,
    layer,
  });

  const addCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    layer: number = 0,
  ): CameraEcsComponent => {
    const entity = world.createEntity();
    const camera = createCamera(renderTarget, layer);

    world.addComponent(entity, cameraId, camera);

    return camera;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      COMPILE_STATUS: 'COMPILE_STATUS',
      LINK_STATUS: 'LINK_STATUS',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      TEXTURE0: 0,
      TEXTURE_2D: 'TEXTURE_2D',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      BLEND: 'BLEND',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',

      disable: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createShader: vi.fn().mockReturnValue({} as WebGLShader),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),

      createProgram: vi.fn().mockReturnValue({} as WebGLProgram),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((_program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS' ? 1 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi
        .fn()
        .mockReturnValue({ name: 'u_texture', type: 0, size: 1 }),
      getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),

      createVertexArray: vi.fn().mockReturnValue({} as WebGLVertexArrayObject),
      bindVertexArray: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),

      bindFramebuffer: vi.fn(),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      drawArrays: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(passthroughVertexShader))
      .addShader(new ForgeShaderSource(passthroughFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createPresentEcsSystem(renderContext));
  });

  it('does nothing for a camera without a render target', () => {
    addCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it("draws the camera's render target texture onto the canvas", () => {
    const target = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 256,
      height: 256,
    } as RenderTarget;

    addCameraEntity(target);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      null,
    );
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    expect(mockGl.bindTexture).toHaveBeenCalledWith(
      mockGl.TEXTURE_2D,
      target.colorTexture,
    );
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, 6);
  });

  it('presents multiple cameras independently', () => {
    const targetA = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('clears the canvas only once when layering multiple different render targets', () => {
    const targetA = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(1);
  });

  it('replaces the canvas for the first layer and blends subsequent layers on top', () => {
    const targetA = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.blendFunc).toHaveBeenCalledWith(
      mockGl.SRC_ALPHA,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
  });

  it('presents in ascending layer order regardless of camera creation order', () => {
    const background = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;
    const foreground = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as RenderTarget;

    // The foreground camera (higher layer) is added first, but its target
    // must still be presented second, since layer (not creation order)
    // determines draw order.
    addCameraEntity(foreground, 1);
    addCameraEntity(background, 0);

    world.update();

    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      1,
      mockGl.TEXTURE_2D,
      background.colorTexture,
    );
    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      2,
      mockGl.TEXTURE_2D,
      foreground.colorTexture,
    );
  });

  it('clears the canvas again on the next frame', () => {
    const targetA = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();
    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(2);
  });

  it('presents a render target shared by multiple cameras only once', () => {
    const sharedTarget = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;

    addCameraEntity(sharedTarget);
    addCameraEntity(sharedTarget);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it('presents again on the next frame', () => {
    const target = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;

    addCameraEntity(target);

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('disables blending before drawing so the present pass replaces the canvas', () => {
    const target = {
      colorTexture: new WebGLTexture(),
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as RenderTarget;

    addCameraEntity(target);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });
});
