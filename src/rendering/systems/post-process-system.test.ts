/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createPostProcessEcsSystem } from './post-process-system';
import { EcsWorld } from '../../ecs';
import {
  addCameraComponent,
  addPostProcessComponent,
  CameraEcsComponent,
} from '../components';
import { Material } from '../materials';
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
globalThis.WebGLTexture = class WebGLTexture {};

describe('createPostProcessEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let passSources: unknown[];

  /** A pass whose `u_texture` values are recorded in `passSources`. */
  const createPassMaterial = (): Material => {
    const material = new Material(
      renderContext.shaderCache.getShader('passthrough.vert'),
      renderContext.shaderCache.getShader('passthrough.frag'),
      mockGl,
    );
    const setUniform = material.setUniform.bind(material);

    vi.spyOn(material, 'setUniform').mockImplementation((name, value) => {
      passSources.push(value);
      setUniform(name, value);
    });

    return material;
  };

  const addPostProcessedCamera = (
    renderTarget: CameraEcsComponent['renderTarget'],
    materials: Material[],
  ): number => {
    const entity = world.createEntity();

    addCameraComponent(world, entity, { isStatic: true, renderTarget });
    addPostProcessComponent(world, entity, { materials });

    return entity;
  };

  /** The framebuffer bound for each draw, in draw order. */
  const drawDestinations = (): unknown[] => {
    const bindFramebuffer = mockGl.bindFramebuffer as Mock<
      (target: unknown, framebuffer: unknown) => void
    >;
    const bindOrders = bindFramebuffer.mock.invocationCallOrder;
    const drawOrders = (mockGl.drawArrays as Mock).mock.invocationCallOrder;

    return drawOrders.map((drawOrder) => {
      const lastBindIndex = bindOrders.findLastIndex(
        (order) => order < drawOrder,
      );

      return bindFramebuffer.mock.calls[lastBindIndex][1];
    });
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    passSources = [];

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

      createFramebuffer: vi.fn().mockImplementation(() => ({})),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      getExtension: vi.fn().mockReturnValue({}),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),

      createTexture: vi.fn().mockImplementation(() => new WebGLTexture()),
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
          pname === 'ACTIVE_UNIFORMS' ? 1 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),
      getActiveUniform: vi.fn().mockReturnValue({
        name: 'u_texture',
        type: 0x8b5e /* SAMPLER_2D */,
        size: 1,
      }),
      getUniformLocation: vi.fn().mockReturnValue({}),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
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
      .addShader(new ForgeShaderSource(passthroughFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createPostProcessEcsSystem(renderContext));
  });

  const resetCalls = (): void => {
    (mockGl.drawArrays as Mock).mockClear();
    passSources = [];
    (mockGl.bindFramebuffer as Mock).mockClear();
  };

  it('does nothing for a camera without a render target', () => {
    addPostProcessedCamera(undefined, [createPassMaterial()]);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does nothing for a camera with no passes', () => {
    addPostProcessedCamera(new RenderTarget(mockGl, 64, 64), []);

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('runs a single pass into a scratch target, then copies it back', () => {
    const target = new RenderTarget(mockGl, 64, 64);

    addPostProcessedCamera(target, [createPassMaterial()]);
    resetCalls();

    world.update();

    const [passDestination, copyDestination] = drawDestinations();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
    expect(passSources).toEqual([target.colorTexture]);
    expect(passDestination).not.toBe(target.framebuffer);
    expect(copyDestination).toBe(target.framebuffer);
  });

  it('chains passes, each sampling the previous output, ending in the target without a copy', () => {
    const target = new RenderTarget(mockGl, 64, 64);

    addPostProcessedCamera(target, [
      createPassMaterial(),
      createPassMaterial(),
    ]);
    resetCalls();

    world.update();

    const [firstSource, secondSource] = passSources;
    const [firstDestination, secondDestination] = drawDestinations();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
    expect(firstSource).toBe(target.colorTexture);
    expect(secondSource).not.toBe(target.colorTexture);
    expect(firstDestination).not.toBe(target.framebuffer);
    expect(secondDestination).toBe(target.framebuffer);
  });

  it('copies back after an odd number of passes', () => {
    const target = new RenderTarget(mockGl, 64, 64);

    addPostProcessedCamera(target, [
      createPassMaterial(),
      createPassMaterial(),
      createPassMaterial(),
    ]);
    resetCalls();

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(4);
    expect(drawDestinations().at(-1)).toBe(target.framebuffer);
  });

  it('runs the passes over a render target shared by several cameras once', () => {
    const target = new RenderTarget(mockGl, 64, 64);

    addPostProcessedCamera(target, [createPassMaterial()]);
    addPostProcessedCamera(target, [createPassMaterial()]);
    resetCalls();

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('picks up passes added to the component at runtime', () => {
    const target = new RenderTarget(mockGl, 64, 64);
    const entity = world.createEntity();

    addCameraComponent(world, entity, { isStatic: true, renderTarget: target });

    const postProcess = addPostProcessComponent(world, entity, {
      materials: [],
    });

    world.update();
    postProcess.materials.push(createPassMaterial());
    resetCalls();
    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('frees its scratch targets when the world stops, even for removed cameras', () => {
    const target = new RenderTarget(mockGl, 64, 64);
    const entity = addPostProcessedCamera(target, [createPassMaterial()]);

    world.update();
    world.removeEntity(entity);
    (mockGl.deleteFramebuffer as Mock).mockClear();

    world.stop();

    expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(1);
  });

  it('recreates its scratch target when the camera target is resized', () => {
    const target = new RenderTarget(mockGl, 64, 64);

    addPostProcessedCamera(target, [createPassMaterial()]);
    world.update();
    (mockGl.deleteFramebuffer as Mock).mockClear();

    target.resize(mockGl, 128, 128);
    world.update();

    expect(mockGl.deleteFramebuffer).toHaveBeenCalledTimes(1);
  });
});
