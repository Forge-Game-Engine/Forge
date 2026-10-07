/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createToneMapEcsSystem } from './tone-map-system';
import { EcsWorld } from '../../ecs';
import {
  addCameraComponent,
  addToneMappingComponent,
  CameraEcsComponent,
  ToneMappingEcsComponent,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { ImageCache } from '../../asset-loading';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';
import {
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
  toneMappingFragmentShader,
} from '../shaders';

describe('createToneMapEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let textureLocation: WebGLUniformLocation;
  let exposureLocation: WebGLUniformLocation;
  let useAcesLocation: WebGLUniformLocation;

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

  const addToneMappedCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    options?: Partial<ToneMappingEcsComponent>,
  ): number => {
    const entity = addCameraEntity(renderTarget);

    addToneMappingComponent(world, entity, options);

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    textureLocation = {};
    exposureLocation = {};
    useAcesLocation = {};

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

      createShader: vi.fn().mockReturnValue({}),
      deleteShader: vi.fn(),
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
          pname === 'ACTIVE_UNIFORMS' ? 3 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      // The tone-mapping shader's active uniforms. The system's material
      // sets every one of them, so Material.bind() never falls back to a
      // default value here.
      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_exposure', type: 0x1406 /* FLOAT */, size: 1 },
            { name: 'u_useAces', type: 0x8b56 /* BOOL */, size: 1 },
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

  it('draws a single tone-mapping pass, with no copy back', () => {
    const target = new RenderTarget(mockGl, 256, 256);

    addToneMappedCameraEntity(target);

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it("samples the target's previous buffer and draws into its other one", () => {
    const target = new RenderTarget(mockGl, 256, 256);
    const sceneTexture = target.colorTexture;

    addToneMappedCameraEntity(target);

    world.update();

    expect(target.colorTexture).not.toBe(sceneTexture);
    // The material binds its sampler last, after the second buffer's
    // texture was created (and bound) for the swap.
    expect((mockGl.bindTexture as Mock).mock.lastCall?.[1]).toBe(
      sceneTexture.glTexture,
    );
    expect((mockGl.bindFramebuffer as Mock).mock.lastCall?.[1]).toBe(
      target.framebuffer,
    );
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

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it('tone-maps again on the next frame', () => {
    const target = new RenderTarget(mockGl, 128, 128);

    addToneMappedCameraEntity(target);

    world.update();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });
});
