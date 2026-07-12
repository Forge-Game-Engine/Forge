/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createBloomEcsSystem } from './bloom-system';
import { EcsWorld } from '../../ecs';
import {
  BloomEcsComponent,
  bloomId,
  CameraEcsComponent,
  cameraId,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import { addBloom } from '../utilities';
import {
  bloomCompositeFragmentShader,
  bloomThresholdFragmentShader,
  ForgeShaderSource,
  gaussianBlurFragmentShader,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture =
  class WebGLTexture {} as unknown as typeof WebGLTexture;

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
    layer: 0,
  });

  const addCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): number => {
    const entity = world.createEntity();

    world.addComponent(entity, cameraId, createCamera(renderTarget));

    return entity;
  };

  const addBloomedCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    bloomOptions?: Partial<BloomEcsComponent>,
  ): number => {
    const entity = addCameraEntity(renderTarget);

    addBloom(world, entity, bloomOptions);

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    directionLocation = {} as WebGLUniformLocation;
    texelSizeLocation = {} as WebGLUniformLocation;
    textureLocation = {} as WebGLUniformLocation;
    thresholdLocation = {} as WebGLUniformLocation;
    sceneTextureLocation = {} as WebGLUniformLocation;
    bloomTextureLocation = {} as WebGLUniformLocation;
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
          pname === 'ACTIVE_UNIFORMS' ? 7 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      // Every material's program is reported as having the union of every
      // uniform used across the threshold/blur/composite/copy shaders.
      // Materials only ever set values for the uniforms their own shader
      // actually declares, so this over-broad reporting is harmless:
      // Material.bind() simply skips uniforms whose value was never set.
      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_direction', type: 0, size: 1 },
            { name: 'u_texelSize', type: 0, size: 1 },
            { name: 'u_threshold', type: 0, size: 1 },
            { name: 'u_sceneTexture', type: 0, size: 1 },
            { name: 'u_bloomTexture', type: 0, size: 1 },
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
      .addShader(new ForgeShaderSource(bloomThresholdFragmentShader))
      .addShader(new ForgeShaderSource(bloomCompositeFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createBloomEcsSystem(renderContext));
  });

  it('does nothing for a camera without a BloomEcsComponent', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does nothing for a bloomed camera without a render target', () => {
    addBloomedCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('draws threshold, blur, composite, and copy passes for a single configured pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    // 1 threshold + 2 blur (horizontal + vertical) + 1 composite + 1 copy.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);
  });

  it('runs a horizontal blur pass followed by a vertical blur pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

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
    const target = new RenderTarget(mockGl, 256, 256);

    addBloomedCameraEntity(target, { passes: 3 });

    world.update();

    // 1 threshold + (3 passes * 2 draws) + 1 composite + 1 copy.
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(9);

    const directionCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === directionLocation,
    );

    expect(directionCalls).toHaveLength(6);
  });

  it('passes the configured threshold to the threshold pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBloomedCameraEntity(target, { passes: 1, threshold: 0.6 });

    world.update();

    const thresholdCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === thresholdLocation,
    );

    expect(thresholdCalls).toHaveLength(1);
    expect(thresholdCalls[0][1]).toBeCloseTo(0.6);
  });

  it('passes the configured intensity to the composite pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBloomedCameraEntity(target, { passes: 1, intensity: 1.5 });

    world.update();

    const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === intensityLocation,
    );

    expect(intensityCalls).toHaveLength(1);
    expect(intensityCalls[0][1]).toBeCloseTo(1.5);
  });

  it('reads the current passes value from the component every frame', () => {
    const target = new RenderTarget(mockGl, 256, 256);
    const entity = addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);

    (mockGl.drawArrays as Mock).mockClear();

    const bloom = world.getComponent<BloomEcsComponent>(entity, bloomId)!;

    bloom.passes = 3;

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(9);
  });

  it('writes the final pass back into the camera render target', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addBloomedCameraEntity(target, { passes: 2 });

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
  });

  it('keeps the texel size at a single downsampled texel regardless of pass count', () => {
    const target = new RenderTarget(mockGl, 256, 128);

    addBloomedCameraEntity(target, { passes: 3 });

    world.update();

    const texelSizeCalls = (mockGl.uniform2fv as Mock).mock.calls.filter(
      ([location]) => location === texelSizeLocation,
    );

    expect(texelSizeCalls).toHaveLength(6);

    // The blur chain runs at a quarter of the render target's resolution
    // (see `bloomDownsampleFactor`), so a texel here is 4 render-target
    // pixels wide, not 1.
    for (const [, value] of texelSizeCalls) {
      expect(Array.from(value as Float32Array)).toEqual([1 / 64, 1 / 32]);
    }
  });

  it('blooms multiple cameras independently', () => {
    const targetA = new RenderTarget(mockGl, 128, 128);
    const targetB = new RenderTarget(mockGl, 64, 64);

    addBloomedCameraEntity(targetA, { passes: 1 });
    addBloomedCameraEntity(targetB, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(10);
  });

  it('blooms a render target shared by multiple cameras only once', () => {
    const sharedTarget = new RenderTarget(mockGl, 128, 128);

    addBloomedCameraEntity(sharedTarget, { passes: 1 });
    addBloomedCameraEntity(sharedTarget, { passes: 1 });

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);
  });

  it('blooms again on the next frame', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(10);
  });

  it('disables blending before drawing so each pass replaces its destination', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addBloomedCameraEntity(target, { passes: 1 });

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  describe('cleanupEntities', () => {
    it('disposes the scratch bright, ping-pong, and composite targets when the world stops', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBloomedCameraEntity(target, { passes: 1 });

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      // Bright target (1) + ping-pong target (2) + composite target (1),
      // each with 1 framebuffer and 1 color texture.
      expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(4);
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(4);
    });

    it('does not throw for a bloomed camera that never got a render target', () => {
      addBloomedCameraEntity();

      world.update();

      expect(() => world.stop()).not.toThrow();
    });
  });

  describe('intensity', () => {
    it('draws nothing when intensity is 0', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBloomedCameraEntity(target, { passes: 2, intensity: 0 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('clamps intensity below 0 down to 0', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBloomedCameraEntity(target, { passes: 2, intensity: -0.5 });

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('does not clamp intensity above 1', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addBloomedCameraEntity(target, { passes: 1, intensity: 2 });

      world.update();

      const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
        ([location]) => location === intensityLocation,
      );

      expect(intensityCalls[0][1]).toBeCloseTo(2);
    });

    it('reflects a runtime change to the component on the next frame', () => {
      const target = new RenderTarget(mockGl, 128, 128);
      const entity = addBloomedCameraEntity(target, {
        passes: 1,
        intensity: 1,
      });

      world.update();
      expect(mockGl.drawArrays).toHaveBeenCalledTimes(5);

      (mockGl.drawArrays as Mock).mockClear();

      const bloom = world.getComponent<BloomEcsComponent>(entity, bloomId)!;

      bloom.intensity = 0;

      world.update();

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
  });
});
