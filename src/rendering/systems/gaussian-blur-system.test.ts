/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createGaussianBlurEcsSystem } from './gaussian-blur-system';
import { EcsWorld } from '../../ecs';
import { CameraEcsComponent, cameraId } from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import {
  blurMixFragmentShader,
  ForgeShaderSource,
  gaussianBlurFragmentShader,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture =
  class WebGLTexture {} as unknown as typeof WebGLTexture;

describe('createGaussianBlurEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let directionLocation: WebGLUniformLocation;
  let texelSizeLocation: WebGLUniformLocation;
  let textureLocation: WebGLUniformLocation;
  let sharpTextureLocation: WebGLUniformLocation;
  let blurredTextureLocation: WebGLUniformLocation;
  let intensityLocation: WebGLUniformLocation;

  const createCamera = (
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): CameraEcsComponent => ({
    zoom: 1,
    zoomSensitivity: 0.1,
    panSensitivity: 1,
    minZoom: 0.0001,
    maxZoom: 10000,
    isStatic: true,
    cullingMask: 0xffffffff,
    renderTarget,
  });

  const addCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): CameraEcsComponent => {
    const entity = world.createEntity();
    const camera = createCamera(renderTarget);

    world.addComponent(entity, cameraId, camera);

    return camera;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    directionLocation = {} as WebGLUniformLocation;
    texelSizeLocation = {} as WebGLUniformLocation;
    textureLocation = {} as WebGLUniformLocation;
    sharpTextureLocation = {} as WebGLUniformLocation;
    blurredTextureLocation = {} as WebGLUniformLocation;
    intensityLocation = {} as WebGLUniformLocation;

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
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      BLEND: 'BLEND',

      disable: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createFramebuffer: vi.fn().mockReturnValue({} as WebGLFramebuffer),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),

      createTexture: vi.fn().mockReturnValue(new WebGLTexture()),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),

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
          pname === 'ACTIVE_UNIFORMS' ? 6 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      // Every material's program is reported as having the union of every
      // uniform used across the blur/copy/mix shaders. Materials only ever
      // set values for the uniforms their own shader actually declares, so
      // this over-broad reporting is harmless: Material.bind() simply skips
      // uniforms whose value was never set.
      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_direction', type: 0, size: 1 },
            { name: 'u_texelSize', type: 0, size: 1 },
            { name: 'u_sharpTexture', type: 0, size: 1 },
            { name: 'u_blurredTexture', type: 0, size: 1 },
            { name: 'u_intensity', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation((_program, name: string) => {
          if (name === 'u_direction') {
            return directionLocation;
          }

          if (name === 'u_texelSize') {
            return texelSizeLocation;
          }

          if (name === 'u_sharpTexture') {
            return sharpTextureLocation;
          }

          if (name === 'u_blurredTexture') {
            return blurredTextureLocation;
          }

          if (name === 'u_intensity') {
            return intensityLocation;
          }

          return textureLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform2fv: vi.fn(),
      activeTexture: vi.fn(),

      createVertexArray: vi.fn().mockReturnValue({} as WebGLVertexArrayObject),
      bindVertexArray: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),

      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      drawArrays: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(passthroughVertexShader))
      .addShader(new ForgeShaderSource(passthroughFragmentShader))
      .addShader(new ForgeShaderSource(gaussianBlurFragmentShader))
      .addShader(new ForgeShaderSource(blurMixFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
  });

  it('does nothing for a camera without a render target', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext));
    addCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('draws a horizontal and a vertical pass for a single configured pass', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('runs a horizontal pass followed by a vertical pass', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(2);
    expect(Array.from(directionCalls[0][1] as Float32Array)).toEqual([1, 0]);
    expect(Array.from(directionCalls[1][1] as Float32Array)).toEqual([0, 1]);
  });

  it('repeats the horizontal/vertical pair once per configured pass', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 3 }));

    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(6);

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(6);

    const directions = directionCalls.map(([, value]) =>
      Array.from(value as Float32Array),
    );

    expect(directions).toEqual([
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
    ]);
  });

  it('defaults to more than one pass', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext));

    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(8);
  });

  it('writes the final pass back into the camera render target', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 2 }));

    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
  });

  it('keeps the texel size at a single texel regardless of pass count', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 3 }));

    const target = new RenderTarget(mockGl, 256, 128);

    addCameraEntity(target);

    world.update();

    const texelSizeCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === texelSizeLocation,
    );

    expect(texelSizeCalls).toHaveLength(6);

    for (const [, value] of texelSizeCalls) {
      expect(Array.from(value as Float32Array)).toEqual([1 / 256, 1 / 128]);
    }
  });

  it('presents multiple cameras independently', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const targetA = new RenderTarget(mockGl, 128, 128);
    const targetB = new RenderTarget(mockGl, 64, 64);

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it('blurs a render target shared by multiple cameras only once', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const sharedTarget = new RenderTarget(mockGl, 128, 128);

    addCameraEntity(sharedTarget);
    addCameraEntity(sharedTarget);

    world.update();

    // 1 pass = 1 horizontal + 1 vertical draw; if the shared target were
    // blurred once per camera this would be 4, not 2.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('blurs again on the next frame', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const target = new RenderTarget(mockGl, 128, 128);

    addCameraEntity(target);

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it('disables blending before drawing so each pass replaces its destination', () => {
    world.addSystem(createGaussianBlurEcsSystem(renderContext, { passes: 1 }));

    const target = new RenderTarget(mockGl, 128, 128);

    addCameraEntity(target);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  describe('intensity', () => {
    it('draws nothing when intensity is 0', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, { passes: 2, intensity: 0 }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('skips blending and draws exactly the blur passes when intensity is 1', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, { passes: 2, intensity: 1 }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      // 2 passes = 4 draws (2 horizontal + 2 vertical), no snapshot/mix/copy.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === intensityLocation,
      );

      expect(intensityCalls).toHaveLength(0);
    });

    it('blends the sharp and blurred scene for a fractional intensity', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, {
          passes: 1,
          intensity: 0.35,
        }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      // 1 pass (2 draws) + snapshot copy + mix + final copy-back = 5.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === intensityLocation,
      );

      expect(intensityCalls).toHaveLength(1);
      expect(intensityCalls[0][1]).toBeCloseTo(0.35);
    });

    it('ends by writing back into the camera render target', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, {
          passes: 1,
          intensity: 0.5,
        }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
        mockGl.FRAMEBUFFER,
        target.framebuffer,
      );
    });

    it('clamps intensity above 1 down to 1', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, {
          passes: 2,
          intensity: 1.5,
        }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      // Behaves exactly like intensity 1: no blend/mix pass added.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
    });

    it('clamps intensity below 0 down to 0', () => {
      world.addSystem(
        createGaussianBlurEcsSystem(renderContext, {
          passes: 2,
          intensity: -0.5,
        }),
      );

      const target = new RenderTarget(mockGl, 128, 128);

      addCameraEntity(target);

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
  });
});
