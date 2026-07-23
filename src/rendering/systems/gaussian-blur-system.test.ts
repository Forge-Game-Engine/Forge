/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createGaussianBlurEcsSystem } from './gaussian-blur-system';
import { EcsWorld } from '../../ecs';
import {
  addCameraComponent,
  addGaussianBlurComponent,
  CameraEcsComponent,
  GaussianBlurEcsComponent,
  gaussianBlurId,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import {
  crossFadeFragmentShader,
  ForgeShaderSource,
  gaussianBlurFragmentShader,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createGaussianBlurEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let directionLocation: WebGLUniformLocation;
  let texelSizeLocation: WebGLUniformLocation;
  let textureLocation: WebGLUniformLocation;
  let fromTextureLocation: WebGLUniformLocation;
  let toTextureLocation: WebGLUniformLocation;
  let factorLocation: WebGLUniformLocation;

  const addCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): number => {
    const entity = world.createEntity();

    addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      renderTarget,
    });

    return entity;
  };

  const addBlurredCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    blurOptions?: Partial<GaussianBlurEcsComponent>,
  ): number => {
    const entity = addCameraEntity(renderTarget);

    addGaussianBlurComponent(world, entity, blurOptions);

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    directionLocation = {};
    texelSizeLocation = {};
    textureLocation = {};
    fromTextureLocation = {};
    toTextureLocation = {};
    factorLocation = {};

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
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createFramebuffer: vi.fn().mockReturnValue({}),
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

      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),

      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((_program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS' ? 6 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      // Every material's program is reported as having the union of every
      // uniform used across the blur/copy/cross-fade shaders. Materials
      // only ever set values for the uniforms their own shader actually
      // declares, so this over-broad reporting is harmless: Material.bind()
      // simply skips uniforms whose value was never set.
      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_direction', type: 0, size: 1 },
            { name: 'u_texelSize', type: 0, size: 1 },
            { name: 'u_fromTexture', type: 0, size: 1 },
            { name: 'u_toTexture', type: 0, size: 1 },
            { name: 'u_factor', type: 0, size: 1 },
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

          if (name === 'u_fromTexture') {
            return fromTextureLocation;
          }

          if (name === 'u_toTexture') {
            return toTextureLocation;
          }

          if (name === 'u_factor') {
            return factorLocation;
          }

          return textureLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform2fv: vi.fn(),
      activeTexture: vi.fn(),

      createVertexArray: vi.fn().mockReturnValue({}),
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
      .addShader(new ForgeShaderSource(crossFadeFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createGaussianBlurEcsSystem(renderContext));
  });

  it('does nothing for a camera without a GaussianBlurEcsComponent', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does nothing for a blurred camera without a render target', () => {
    addBlurredCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('draws a horizontal and a vertical pass for a single configured pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBlurredCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('runs a horizontal pass followed by a vertical pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBlurredCameraEntity(target, { passes: 1 });

    world.update();

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(2);
    expect(Array.from(directionCalls[0][1] as Float32Array)).toEqual([1, 0]);
    expect(Array.from(directionCalls[1][1] as Float32Array)).toEqual([0, 1]);
  });

  it('repeats the horizontal/vertical pair once per configured pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBlurredCameraEntity(target, { passes: 3 });

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

  it('reads the current passes value from the component every frame', () => {
    const target = new RenderTarget(mockGl, 256, 256);
    const entity = addBlurredCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);

    (mockGl.drawArrays as Mock).mockClear();

    const blur = world.getComponent<GaussianBlurEcsComponent>(
      entity,
      gaussianBlurId,
    )!;

    blur.passes = 3;

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(6);
  });

  it('writes the final pass back into the camera render target', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBlurredCameraEntity(target, { passes: 2 });

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
  });

  it('keeps the texel size at a single texel regardless of pass count', () => {
    const target = new RenderTarget(mockGl, 256, 128);

    addBlurredCameraEntity(target, { passes: 3 });

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
    const targetA = new RenderTarget(mockGl, 128, 128);
    const targetB = new RenderTarget(mockGl, 64, 64);

    addBlurredCameraEntity(targetA, { passes: 1 });
    addBlurredCameraEntity(targetB, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it('blurs a render target shared by multiple cameras only once', () => {
    const sharedTarget = new RenderTarget(mockGl, 128, 128);

    addBlurredCameraEntity(sharedTarget, { passes: 1 });
    addBlurredCameraEntity(sharedTarget, { passes: 1 });

    world.update();

    // 1 pass = 1 horizontal + 1 vertical draw; if the shared target were
    // blurred once per camera this would be 4, not 2.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('blurs again on the next frame', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addBlurredCameraEntity(target, { passes: 1 });

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it('disables blending before drawing so each pass replaces its destination', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addBlurredCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  describe('cleanupEntities', () => {
    it('disposes the scratch ping-pong target when the world stops', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 1, intensity: 1 });

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      // The ping-pong target owns 2 render targets, each with 1 framebuffer
      // and 1 color texture.
      expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(2);
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(2);
    });

    it('also disposes the sharp snapshot target when intensity is fractional', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 1, intensity: 0.5 });

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      // Ping-pong target (2 render targets) + sharp snapshot (1 render target).
      expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(3);
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(3);
    });

    it('does not throw for a blurred camera that never got a render target', () => {
      addBlurredCameraEntity();

      world.update();

      expect(() => world.stop()).not.toThrow();
    });
  });

  describe('intensity', () => {
    it('draws nothing when intensity is 0', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 2, intensity: 0 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('skips blending and draws exactly the blur passes when intensity is 1', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 2, intensity: 1 });

      world.update();

      // 2 passes = 4 draws (2 horizontal + 2 vertical), no snapshot/mix/copy.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === factorLocation,
      );

      expect(intensityCalls).toHaveLength(0);
    });

    it('blends the sharp and blurred scene for a fractional intensity', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 1, intensity: 0.35 });

      world.update();

      // 1 pass (2 draws) + snapshot copy + mix + final copy-back = 5.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === factorLocation,
      );

      expect(intensityCalls).toHaveLength(1);
      expect(intensityCalls[0][1]).toBeCloseTo(0.35);
    });

    it('ends by writing back into the camera render target', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 1, intensity: 0.5 });

      world.update();

      expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
        mockGl.FRAMEBUFFER,
        target.framebuffer,
      );
    });

    it('clamps intensity above 1 down to 1', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 2, intensity: 1.5 });

      world.update();

      // Behaves exactly like intensity 1: no blend/mix pass added.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
    });

    it('clamps intensity below 0 down to 0', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 2, intensity: -0.5 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('reflects a runtime change to the component on the next frame', () => {
      const target = new RenderTarget(mockGl, 128, 128);
      const entity = addBlurredCameraEntity(target, {
        passes: 1,
        intensity: 1,
      });

      world.update();
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);

      (mockGl.drawArrays as Mock).mockClear();

      const blur = world.getComponent<GaussianBlurEcsComponent>(
        entity,
        gaussianBlurId,
      )!;

      blur.intensity = 0.5;

      world.update();

      // Dropping below 1 adds the snapshot/mix/copy-back draws.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);
    });
  });
});
