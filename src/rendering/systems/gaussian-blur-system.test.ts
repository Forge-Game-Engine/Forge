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
  boxDownsampleFragmentShader,
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
  let blockSizeLocation: WebGLUniformLocation;
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
    blockSizeLocation = {};
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
          pname === 'ACTIVE_UNIFORMS' ? 7 : true,
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
            { name: 'u_texture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_direction', type: 0x8b50 /* FLOAT_VEC2 */, size: 1 },
            { name: 'u_texelSize', type: 0x8b50 /* FLOAT_VEC2 */, size: 1 },
            { name: 'u_fromTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_toTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_factor', type: 0x1406 /* FLOAT */, size: 1 },
            { name: 'u_blockSize', type: 0x1404 /* INT */, size: 1 },
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

          if (name === 'u_blockSize') {
            return blockSizeLocation;
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
      .addShader(new ForgeShaderSource(crossFadeFragmentShader))
      .addShader(new ForgeShaderSource(boxDownsampleFragmentShader));

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

  describe('never samples the texture it is drawing into', () => {
    /**
     * Gives every framebuffer and texture its own identity, and records each
     * draw that samples the color texture attached to the framebuffer it's
     * drawing into: a feedback loop, which WebGL leaves undefined (in
     * practice, a black or garbage result).
     * @returns The draws found to read their own destination, by index.
     */
    const trackFeedbackLoops = (): number[] => {
      const attachments = new Map<unknown, unknown>();
      const sampledTextures = new Set<unknown>();
      const feedbackDraws: number[] = [];
      let boundFramebuffer: unknown = null;
      let drawIndex = 0;

      (mockGl.createFramebuffer as Mock).mockImplementation(() => ({}));
      (mockGl.createTexture as Mock).mockImplementation(
        () => new WebGLTexture(),
      );
      (mockGl.bindFramebuffer as Mock).mockImplementation(
        (_target: unknown, framebuffer: unknown) => {
          boundFramebuffer = framebuffer;
          sampledTextures.clear();
        },
      );
      (mockGl.framebufferTexture2D as Mock).mockImplementation(
        (
          _target: unknown,
          _attachment: unknown,
          _texTarget: unknown,
          texture: unknown,
        ) => {
          attachments.set(boundFramebuffer, texture);
        },
      );
      (mockGl.bindTexture as Mock).mockImplementation(
        (_target: unknown, texture: unknown) => {
          sampledTextures.add(texture);
        },
      );
      (mockGl.drawArrays as Mock).mockImplementation(() => {
        if (sampledTextures.has(attachments.get(boundFramebuffer))) {
          feedbackDraws.push(drawIndex);
        }

        drawIndex++;
        sampledTextures.clear();
      });

      return feedbackDraws;
    };

    for (const pixelRatio of [1, 2]) {
      for (const intensity of [1, 0.5]) {
        it(`at a pixel ratio of ${pixelRatio} and an intensity of ${intensity}`, () => {
          const feedbackDraws = trackFeedbackLoops();

          renderContext.pixelRatio = pixelRatio;

          const target = new RenderTarget(
            mockGl,
            256 * pixelRatio,
            128 * pixelRatio,
          );

          addBlurredCameraEntity(target, { passes: 3, intensity });

          world.update();

          expect(mockGl.drawArrays).toHaveBeenCalled();
          expect(feedbackDraws).toEqual([]);
        });
      }
    }
  });

  describe('pixel ratio', () => {
    const getAllocatedSizes = (): number[][] =>
      (mockGl.texImage2D as Mock).mock.calls.map(
        ([, , , width, height]: unknown[]) => [Number(width), Number(height)],
      );

    const getDrawTargets = (): unknown[] =>
      (mockGl.bindFramebuffer as Mock).mock.calls.map(
        ([, framebuffer]: unknown[]) => framebuffer,
      );

    it('blurs at full resolution, without a downsample pass, at a pixel ratio of 1', () => {
      const target = new RenderTarget(mockGl, 256, 128);

      (mockGl.texImage2D as Mock).mockClear();

      addBlurredCameraEntity(target, { passes: 1 });

      world.update();

      expect(getAllocatedSizes()).toEqual([
        [256, 128],
        [256, 128],
      ]);
      // Just the horizontal and vertical blur: no downsample pass.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
    });

    it('blurs at CSS-pixel resolution on a high-DPI display', () => {
      renderContext.pixelRatio = 2;

      const target = new RenderTarget(mockGl, 512, 256);

      (mockGl.texImage2D as Mock).mockClear();

      addBlurredCameraEntity(target, { passes: 1 });

      world.update();

      // The ping-pong pair is sized in CSS pixels: 512x256 device pixels at
      // a pixel ratio of 2.
      expect(getAllocatedSizes()).toEqual([
        [256, 128],
        [256, 128],
      ]);

      // A downsample pass averaging each 2x2 block, then the horizontal and
      // vertical blur.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(3);
      expect(mockGl.uniform1i).toHaveBeenCalledWith(blockSizeLocation, 2);
    });

    it('steps the kernel one CSS pixel per tap at any pixel ratio', () => {
      const cssWidth = 256;
      const cssHeight = 128;

      for (const pixelRatio of [1, 1.5, 2, 3]) {
        (mockGl.uniform2fv as Mock).mockClear();
        renderContext.pixelRatio = pixelRatio;

        const target = new RenderTarget(
          mockGl,
          cssWidth * pixelRatio,
          cssHeight * pixelRatio,
        );
        const entity = addBlurredCameraEntity(target, { passes: 1 });

        world.update();
        world.removeEntity(entity);

        const blurTexelSizes = (mockGl.uniform2fv as Mock).mock.calls.filter(
          ([location]) => location === texelSizeLocation,
        );

        // The first call is the downsample pass's, when there is one.
        const [x, y] = Array.from(
          blurTexelSizes[blurTexelSizes.length - 1][1] as Float32Array,
        );

        expect(x * cssWidth).toBeCloseTo(1);
        expect(y * cssHeight).toBeCloseTo(1);
      }
    });

    it('upsamples back into the camera render target on the last pass', () => {
      renderContext.pixelRatio = 2;

      // Distinct framebuffer objects, so draws into the camera's target can be told
      // apart from draws into the ping-pong pair.
      (mockGl.createFramebuffer as Mock).mockImplementation(() => ({}));

      const target = new RenderTarget(mockGl, 512, 256);

      addBlurredCameraEntity(target, { passes: 3 });

      (mockGl.bindFramebuffer as Mock).mockClear();

      world.update();

      const drawTargets = getDrawTargets().filter(
        (framebuffer) => framebuffer !== null,
      );

      // Only the very last draw writes to the full-resolution target; every
      // earlier pass stays in the downsampled ping-pong pair.
      expect(drawTargets[drawTargets.length - 1]).toBe(target.framebuffer);
      expect(
        drawTargets.filter((framebuffer) => framebuffer === target.framebuffer),
      ).toHaveLength(1);
    });

    it('cross-fades against the full-resolution scene for a fractional intensity', () => {
      renderContext.pixelRatio = 2;

      const target = new RenderTarget(mockGl, 512, 256);

      (mockGl.texImage2D as Mock).mockClear();

      addBlurredCameraEntity(target, { passes: 1, intensity: 0.5 });

      world.update();

      // Downsampled ping-pong pair, then a full-resolution blend target.
      expect(getAllocatedSizes()).toEqual([
        [256, 128],
        [256, 128],
        [512, 256],
      ]);

      // Downsample + 2 blur draws + mix + copy-back.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);
      expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
        mockGl.FRAMEBUFFER,
        target.framebuffer,
      );
    });

    it('recreates the ping-pong pair when the pixel ratio changes', () => {
      const target = new RenderTarget(mockGl, 512, 256);

      addBlurredCameraEntity(target, { passes: 1 });

      world.update();
      (mockGl.texImage2D as Mock).mockClear();

      renderContext.pixelRatio = 2;
      world.update();

      expect(getAllocatedSizes()).toEqual([
        [256, 128],
        [256, 128],
      ]);
    });
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

  describe('cleanup', () => {
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

    it('also disposes the blend target when intensity is fractional', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBlurredCameraEntity(target, { passes: 1, intensity: 0.5 });

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      // Ping-pong target (2 render targets) + blend target (1 render target).
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

      // 1 pass (2 draws) + mix + final copy-back = 4.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);

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

      // Dropping below 1 adds the mix and copy-back draws.
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
    });
  });
});
