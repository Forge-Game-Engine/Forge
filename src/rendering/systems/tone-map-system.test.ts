/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createToneMapEcsSystem } from './tone-map-system';
import { EcsWorld } from '../../ecs';
import {
  CameraEcsComponent,
  cameraId,
  ToneMappingEcsComponent,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import { addToneMapping } from '../utilities';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';
import {
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
  toneMappingFragmentShader,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture =
  class WebGLTexture {} as unknown as typeof WebGLTexture;

describe('createToneMapEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let textureLocation: WebGLUniformLocation;
  let exposureLocation: WebGLUniformLocation;
  let useAcesLocation: WebGLUniformLocation;

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

  const addToneMappedCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    options?: Partial<ToneMappingEcsComponent>,
  ): number => {
    const entity = addCameraEntity(renderTarget);

    addToneMapping(world, entity, options);

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    textureLocation = {} as WebGLUniformLocation;
    exposureLocation = {} as WebGLUniformLocation;
    useAcesLocation = {} as WebGLUniformLocation;

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
      createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createFramebuffer: vi.fn().mockReturnValue({} as WebGLFramebuffer),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      getExtension: vi.fn().mockReturnValue({}),
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
          pname === 'ACTIVE_UNIFORMS' ? 3 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      // Every material's program is reported as having the union of every
      // uniform used across the tone-mapping/copy shaders. Materials only
      // ever set values for the uniforms their own shader actually
      // declares, so this over-broad reporting is harmless: Material.bind()
      // simply skips uniforms whose value was never set.
      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_exposure', type: 0, size: 1 },
            { name: 'u_useAces', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation((_program, name: string) => {
          if (name === 'u_exposure') {
            return exposureLocation;
          }

          if (name === 'u_useAces') {
            return useAcesLocation;
          }

          return textureLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
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
      .addShader(new ForgeShaderSource(toneMappingFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createToneMapEcsSystem(renderContext));
  });

  it('does nothing for a camera without a ToneMappingEcsComponent', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does nothing for a tone-mapped camera without a render target', () => {
    addToneMappedCameraEntity();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('draws a tone-mapping pass followed by a copy-back pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('passes the configured exposure to the tone-mapping pass', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target, { exposure: 2.5 });

    world.update();

    const exposureCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === exposureLocation,
    );

    expect(exposureCalls).toHaveLength(1);
    expect(exposureCalls[0][1]).toBeCloseTo(2.5);
  });

  it('selects the aces operator by default', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target);

    world.update();

    const useAcesCalls = (mockGl.uniform1i as Mock).mock.calls.filter(
      ([location]) => location === useAcesLocation,
    );

    expect(useAcesCalls).toHaveLength(1);
    expect(useAcesCalls[0][1]).toBe(1);
  });

  it('selects reinhard when configured', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target, {
      operator: TONE_MAPPING_OPERATOR.reinhard,
    });

    world.update();

    const useAcesCalls = (mockGl.uniform1i as Mock).mock.calls.filter(
      ([location]) => location === useAcesLocation,
    );

    expect(useAcesCalls[0][1]).toBe(0);
  });

  it('writes the final pass back into the camera render target', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenLastCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
  });

  it('tone-maps a render target shared by multiple cameras only once', () => {
    const sharedTarget = new RenderTarget(mockGl, 128, 128);

    addToneMappedCameraEntity(sharedTarget);
    addToneMappedCameraEntity(sharedTarget);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('tone-maps again on the next frame', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addToneMappedCameraEntity(target);

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
  });

  describe('cleanupEntities', () => {
    it('disposes the scratch target when the world stops', () => {
      const target = new RenderTarget(mockGl, 128, 128);

      addToneMappedCameraEntity(target);

      world.update();
      (mockGl.deleteFramebuffer as Mock).mockClear();
      (mockGl.deleteTexture as Mock).mockClear();

      world.stop();

      expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(1);
    });

    it('does not throw for a tone-mapped camera that never got a render target', () => {
      addToneMappedCameraEntity();

      world.update();

      expect(() => world.stop()).not.toThrow();
    });
  });
});
