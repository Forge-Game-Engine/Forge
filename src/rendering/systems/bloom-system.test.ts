/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createBloomEcsSystem } from './bloom-system';
import { EcsWorld } from '../../ecs';
import {
  addBloomComponent,
  addCameraComponent,
  BloomEcsComponent,
  bloomId,
  CameraEcsComponent,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import { RENDER_TARGET_FORMAT } from '../enums/index.js';
import {
  bloomCompositeFragmentShader,
  bloomThresholdFragmentShader,
  ForgeShaderSource,
  gaussianBlurFragmentShader,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Every uniform used across the threshold/blur/composite/copy shaders.
const knownUniforms: WebGLActiveInfo[] = [
  { name: 'u_texture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
  { name: 'u_direction', type: 0x8b50 /* FLOAT_VEC2 */, size: 1 },
  { name: 'u_texelSize', type: 0x8b50 /* FLOAT_VEC2 */, size: 1 },
  { name: 'u_threshold', type: 0x1406 /* FLOAT */, size: 1 },
  { name: 'u_sceneTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
  { name: 'u_bloomTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
  { name: 'u_intensity', type: 0x1406 /* FLOAT */, size: 1 },
  { name: 'u_blockSize', type: 0x1404 /* INT */, size: 1 },
];

describe('createBloomEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let directionLocation: WebGLUniformLocation;
  let texelSizeLocation: WebGLUniformLocation;
  let textureLocation: WebGLUniformLocation;
  let thresholdLocation: WebGLUniformLocation;
  let sceneTextureLocation: WebGLUniformLocation;
  let bloomTextureLocation: WebGLUniformLocation;
  let intensityLocation: WebGLUniformLocation;
  let blockSizeLocation: WebGLUniformLocation;

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

  const addBloomedCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    bloomOptions?: Partial<BloomEcsComponent>,
  ): number => {
    const entity = addCameraEntity(renderTarget);

    addBloomComponent(world, entity, bloomOptions);

    return entity;
  };

  beforeEach(() => {
    const shaderSources = new Map<unknown, string>();
    const programSources = new Map<unknown, string>();

    // A linked program's active uniforms are the ones its own shaders
    // declare. Material.bind() gives every active uniform a value, so a
    // program reporting another shader's uniforms would upload defaults to
    // them and muddy the per-location assertions below.
    const getActiveUniforms = (program: unknown): WebGLActiveInfo[] => {
      const source = programSources.get(program) ?? '';

      return knownUniforms.filter(({ name }) =>
        new RegExp(`uniform\\s+\\w+\\s+${name}\\s*;`).test(source),
      );
    };

    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    directionLocation = {};
    texelSizeLocation = {};
    textureLocation = {};
    thresholdLocation = {};
    sceneTextureLocation = {};
    bloomTextureLocation = {};
    intensityLocation = {};
    blockSizeLocation = {};

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
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',

      disable: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createFramebuffer: vi.fn().mockImplementation(() => ({})),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      getExtension: vi.fn().mockReturnValue({}),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),

      createTexture: vi.fn().mockImplementation(() => ({})),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),

      createShader: vi.fn().mockImplementation(() => ({})),
      deleteShader: vi.fn(),
      shaderSource: vi
        .fn()
        .mockImplementation((shader: unknown, source: string) => {
          shaderSources.set(shader, source);
        }),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),

      createProgram: vi.fn().mockImplementation(() => ({})),
      attachShader: vi
        .fn()
        .mockImplementation((program: unknown, shader: unknown) => {
          programSources.set(
            program,
            `${programSources.get(program) ?? ''}${shaderSources.get(shader) ?? ''}`,
          );
        }),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS'
            ? getActiveUniforms(program).length
            : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),
      getActiveUniform: vi
        .fn()
        .mockImplementation(
          (program: unknown, index: number) =>
            getActiveUniforms(program)[index] ?? null,
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

          if (name === 'u_threshold') {
            return thresholdLocation;
          }

          if (name === 'u_sceneTexture') {
            return sceneTextureLocation;
          }

          if (name === 'u_bloomTexture') {
            return bloomTextureLocation;
          }

          if (name === 'u_intensity') {
            return intensityLocation;
          }

          if (name === 'u_blockSize') {
            return blockSizeLocation;
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
      .addShader(new ForgeShaderSource(bloomThresholdFragmentShader))
      .addShader(new ForgeShaderSource(bloomCompositeFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createBloomEcsSystem(renderContext));
  });

  it('does nothing for a camera without a BloomEcsComponent', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does nothing for a bloomed camera without a render target', () => {
    addBloomedCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('draws threshold, blur, and composite passes for a single configured pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    // 1 threshold + 2 blur (horizontal + vertical) + 1 composite, with no
    // copy back into the camera's target.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it("composites from the target's previous buffer into its other one", () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });
    const sceneTexture = target.colorTexture;

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    const compositeBindOrder = Math.max(
      ...(mockGl.bindFramebuffer as Mock).mock.calls
        .map((call, index) => ({
          call,
          order: (mockGl.bindFramebuffer as Mock).mock.invocationCallOrder[
            index
          ],
        }))
        .filter(({ call }) => call[1] === target.framebuffer)
        .map(({ order }) => order),
    );
    const texturesBoundForComposite = (mockGl.bindTexture as Mock).mock.calls
      .filter(
        (_call, index) =>
          (mockGl.bindTexture as Mock).mock.invocationCallOrder[index] >
          compositeBindOrder,
      )
      .map(([, texture]) => texture as WebGLTexture);

    expect(target.colorTexture).not.toBe(sceneTexture);
    expect(texturesBoundForComposite).toContain(sceneTexture.glTexture);
    expect(texturesBoundForComposite).not.toContain(
      target.colorTexture.glTexture,
    );
  });

  it('runs a horizontal blur pass followed by a vertical blur pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(2);
    expect(Array.from(directionCalls[0][1] as Float32Array)).toEqual([1, 0]);
    expect(Array.from(directionCalls[1][1] as Float32Array)).toEqual([0, 1]);
  });

  it('repeats the horizontal/vertical blur pair once per configured pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 3 });

    world.update();

    // 1 threshold + (3 passes * 2 draws) + 1 composite.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(8);

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(6);
  });

  it('passes the configured threshold to the threshold pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 1, threshold: 0.6 });

    world.update();

    const thresholdCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === thresholdLocation,
    );

    expect(thresholdCalls).toHaveLength(1);
    expect(thresholdCalls[0][1]).toBeCloseTo(0.6);
  });

  it('passes the configured intensity to the composite pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 1, intensity: 1.5 });

    world.update();

    const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === intensityLocation,
    );

    expect(intensityCalls).toHaveLength(1);
    expect(intensityCalls[0][1]).toBeCloseTo(1.5);
  });

  it('reads the current passes value from the component every frame', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });
    const entity = addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);

    (mockGl.drawArrays as Mock).mockClear();

    const bloom = world.getComponent<BloomEcsComponent>(entity, bloomId)!;

    bloom.passes = 3;

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(8);
  });

  it('draws nothing when passes is 0', () => {
    const target = new RenderTarget(renderContext, { width: 128, height: 128 });

    addBloomedCameraEntity(target, { passes: 0, intensity: 1 });

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('writes the final pass back into the camera render target', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 256 });

    addBloomedCameraEntity(target, { passes: 2 });

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
  });

  it('passes the full-resolution texel size to the threshold pass', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 128 });

    addBloomedCameraEntity(target, { passes: 3 });

    world.update();

    const texelSizeCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === texelSizeLocation,
    );

    // The threshold pass samples a block of the full-resolution source
    // per downsampled destination texel (see bloom-threshold.frag.glsl), so
    // it needs the full-resolution texel size, not the downsampled one the
    // blur passes use.
    expect(Array.from(texelSizeCalls[0][1] as Float32Array)).toEqual([
      1 / 256,
      1 / 128,
    ]);
  });

  it('keeps the blur texel size at a single downsampled texel regardless of pass count', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 128 });

    addBloomedCameraEntity(target, { passes: 3 });

    world.update();

    // First call is the threshold pass's full-resolution texel size (see
    // the test above); the remaining calls are the blur passes'.
    const [, ...blurTexelSizeCalls] = (
      mockGl.uniform2fv as Mock
    ).mock.calls.filter(([location]) => location === texelSizeLocation);

    expect(blurTexelSizeCalls).toHaveLength(6);

    // The blur chain runs at a quarter of the render target's resolution
    // (see `bloomDownsampleFactor`), so a texel here is 4 render-target
    // pixels wide, not 1.
    for (const [, value] of blurTexelSizeCalls) {
      expect(Array.from(value as Float32Array)).toEqual([1 / 64, 1 / 32]);
    }
  });

  it('passes a 4x4 block size to the threshold pass at a pixel ratio of 1', () => {
    const target = new RenderTarget(renderContext, { width: 256, height: 128 });

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.uniform1i).toHaveBeenCalledWith(blockSizeLocation, 4);
  });

  describe('pixel ratio', () => {
    const getBlurTexelSizes = (): number[][] =>
      (mockGl.uniform2fv as Mock).mock.calls
        .filter(([location]) => location === texelSizeLocation)
        .slice(1)
        .map(([, value]) => Array.from(value as Float32Array));

    it('scales the threshold block size with the pixel ratio', () => {
      renderContext.resize(renderContext.cssWidth, renderContext.cssHeight, 2);

      const target = new RenderTarget(renderContext, {
        width: 512,
        height: 256,
      });

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();

      // Each bright-pass texel covers 4x4 CSS pixels, which is 8x8 device
      // pixels at a pixel ratio of 2.
      expect(mockGl.uniform1i).toHaveBeenCalledWith(blockSizeLocation, 8);
    });

    it('rounds a fractional block size to whole texels', () => {
      renderContext.resize(
        renderContext.cssWidth,
        renderContext.cssHeight,
        1.5,
      );

      const target = new RenderTarget(renderContext, {
        width: 384,
        height: 192,
      });

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();

      expect(mockGl.uniform1i).toHaveBeenCalledWith(blockSizeLocation, 6);
    });

    it('sizes the downsampled buffers by the scaled block size', () => {
      renderContext.resize(renderContext.cssWidth, renderContext.cssHeight, 2);

      const target = new RenderTarget(renderContext, {
        width: 512,
        height: 256,
      });

      (mockGl.texImage2D as Mock).mockClear();

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();

      const allocatedSizes = (mockGl.texImage2D as Mock).mock.calls.map(
        ([, , , width, height]: unknown[]) => [Number(width), Number(height)],
      );

      // brightTarget (1) + ping-pong (2) at 512/8 x 256/8, then the
      // full-resolution compositeTarget (1).
      expect(allocatedSizes).toEqual([
        [64, 32],
        [64, 32],
        [64, 32],
        [512, 256],
      ]);
    });

    it('steps the blur the same number of CSS pixels at any pixel ratio', () => {
      const cssWidth = 256;
      const cssHeight = 128;

      const blurTexelSizeInCssPixels = (pixelRatio: number): number[] => {
        (mockGl.uniform2fv as Mock).mockClear();
        renderContext.resize(
          renderContext.cssWidth,
          renderContext.cssHeight,
          pixelRatio,
        );

        const width = cssWidth * pixelRatio;
        const height = cssHeight * pixelRatio;
        const target = new RenderTarget(renderContext, {
          width: width,
          height: height,
        });
        const entity = addBloomedCameraEntity(target, { passes: 1 });

        world.update();
        world.removeEntity(entity);

        const [horizontal] = getBlurTexelSizes();

        return [horizontal[0] * cssWidth, horizontal[1] * cssHeight];
      };

      for (const pixelRatio of [1, 1.1, 1.5, 2, 3]) {
        const [x, y] = blurTexelSizeInCssPixels(pixelRatio);

        expect(x).toBeCloseTo(4);
        expect(y).toBeCloseTo(4);
      }
    });

    it('recreates the downsampled buffers when the pixel ratio changes', () => {
      const target = new RenderTarget(renderContext, {
        width: 512,
        height: 256,
      });

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();
      (mockGl.texImage2D as Mock).mockClear();

      renderContext.resize(renderContext.cssWidth, renderContext.cssHeight, 2);
      world.update();

      const allocatedSizes = (mockGl.texImage2D as Mock).mock.calls.map(
        ([, , , width, height]: unknown[]) => [Number(width), Number(height)],
      );

      expect(allocatedSizes).toEqual([
        [64, 32],
        [64, 32],
        [64, 32],
      ]);
    });
  });

  it('blooms multiple cameras independently', () => {
    const targetA = new RenderTarget(renderContext, {
      width: 128,
      height: 128,
    });
    const targetB = new RenderTarget(renderContext, { width: 64, height: 64 });

    addBloomedCameraEntity(targetA, { passes: 1 });
    addBloomedCameraEntity(targetB, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(8);
  });

  it('blooms a render target shared by multiple cameras only once', () => {
    const sharedTarget = new RenderTarget(renderContext, {
      width: 128,
      height: 128,
    });

    addBloomedCameraEntity(sharedTarget, { passes: 1 });
    addBloomedCameraEntity(sharedTarget, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  it('blooms again on the next frame', () => {
    const target = new RenderTarget(renderContext, { width: 128, height: 128 });

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(8);
  });

  it('disables blending before drawing so each pass replaces its destination', () => {
    const target = new RenderTarget(renderContext, { width: 128, height: 128 });

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  describe('format', () => {
    it('allocates its scratch buffers as ldr for an ldr camera render target', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 256,
      });

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();

      expect(mockGl.texImage2D).not.toHaveBeenCalledWith(
        mockGl.TEXTURE_2D,
        0,
        mockGl.RGBA16F,
        expect.anything(),
        expect.anything(),
        0,
        mockGl.RGBA,
        mockGl.HALF_FLOAT,
        null,
      );
    });

    it('allocates its scratch buffers as hdr when the camera render target is hdr', () => {
      const target = new RenderTarget(
        renderContext,
        { width: 256, height: 256 },
        RENDER_TARGET_FORMAT.hdr,
      );

      (mockGl.texImage2D as Mock).mockClear();

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();

      // brightTarget (1) + ping-pong (2) + the camera target's second
      // buffer (1) all inherit the source render target's hdr format.
      const hdrTexImageCalls = (mockGl.texImage2D as Mock).mock.calls.filter(
        ([, , internalFormat]) => internalFormat === mockGl.RGBA16F,
      );

      expect(hdrTexImageCalls).toHaveLength(4);
    });
  });

  describe('cleanup', () => {
    it('disposes the scratch bright and ping-pong targets when the world stops', () => {
      const target = new RenderTarget(renderContext, {
        width: 128,
        height: 128,
      });

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      // Bright target (1) + ping-pong target (2), each with 1 framebuffer
      // and 1 color texture. The camera's own target isn't the system's to
      // dispose.
      expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(3);
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(3);
    });

    it('does not throw for a bloomed camera that never got a render target', () => {
      addBloomedCameraEntity();

      world.update();

      expect(() => world.stop()).not.toThrow();
    });
  });

  describe('intensity', () => {
    it('draws nothing when intensity is 0', () => {
      const target = new RenderTarget(renderContext, {
        width: 128,
        height: 128,
      });

      addBloomedCameraEntity(target, { passes: 2, intensity: 0 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('clamps intensity below 0 down to 0', () => {
      const target = new RenderTarget(renderContext, {
        width: 128,
        height: 128,
      });

      addBloomedCameraEntity(target, { passes: 2, intensity: -0.5 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('does not clamp intensity above 1', () => {
      const target = new RenderTarget(renderContext, {
        width: 128,
        height: 128,
      });

      addBloomedCameraEntity(target, { passes: 1, intensity: 2 });

      world.update();

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === intensityLocation,
      );

      expect(intensityCalls[0][1]).toBeCloseTo(2);
    });

    it('reflects a runtime change to the component on the next frame', () => {
      const target = new RenderTarget(renderContext, {
        width: 128,
        height: 128,
      });
      const entity = addBloomedCameraEntity(target, {
        passes: 1,
        intensity: 1,
      });

      world.update();
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);

      (mockGl.drawArrays as Mock).mockClear();

      const bloom = world.getComponent<BloomEcsComponent>(entity, bloomId)!;

      bloom.intensity = 0;

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
  });
});
