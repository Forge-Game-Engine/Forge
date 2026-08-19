/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRenderEcsSystem } from './render-system';
import { createPresentEcsSystem } from './present-system';
import { EcsWorld } from '../../ecs';
import { addPositionComponent } from '../../common';
import { Vec2 } from '../../math';
import { addCameraComponent, CameraEcsComponent } from '../components';
import { addSpriteComponent } from '../components';
import { Renderable } from '../renderable';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { Color } from '../color';
import { Geometry } from '../geometry/geometry';
import { Material } from '../materials/material';
import { ImageCache } from '../../asset-loading';
import {
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

/**
 * Item 0.5 (§8, Phase 0): confirm that a UI camera drawing into its own
 * transparent-cleared render target is composited *over* a world camera's
 * opaque render target by the present pass, rather than replacing it -
 * DL-01's "second camera, separate target, higher layer" mechanism, exercised
 * end to end across `createRenderEcsSystem` and `createPresentEcsSystem`
 * together instead of each in isolation.
 */
describe('UI-camera compositing over the world camera', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let worldTarget: RenderTarget;
  let uiTarget: RenderTarget;

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
      DYNAMIC_DRAW: 'DYNAMIC_DRAW',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      BLEND: 'BLEND',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',

      disable: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      drawArraysInstanced: vi.fn(),

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

      getActiveUniform: vi
        .fn()
        .mockReturnValue({ name: 'u_texture', type: 0, size: 1 }),
      getUniformLocation: vi.fn().mockReturnValue({}),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),

      createVertexArray: vi.fn().mockReturnValue({}),
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
    world.addSystem(createRenderEcsSystem(renderContext));
    world.addSystem(createPresentEcsSystem(renderContext));

    worldTarget = {
      colorTexture: new WebGLTexture(),
      framebuffer: {},
      width: 800,
      height: 600,
    } as RenderTarget;

    uiTarget = {
      colorTexture: new WebGLTexture(),
      framebuffer: {},
      width: 800,
      height: 600,
    } as RenderTarget;
  });

  const addCameraEntity = (
    renderTarget: CameraEcsComponent['renderTarget'],
    layer: number,
    clearColor: Color,
  ): void => {
    const entity = world.createEntity();

    addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      cullingMask: 0xffffffff,
      renderTarget,
      layer,
      clearColor,
    });

    addPositionComponent(world, entity);
  };

  it('clears the world target opaquely and the UI target transparently', () => {
    addCameraEntity(worldTarget, 0, Color.black);
    addCameraEntity(uiTarget, 1, Color.transparent);

    world.update();

    expect(mockGl.clearColor).toHaveBeenNthCalledWith(1, 0, 0, 0, 1);
    expect(mockGl.clearColor).toHaveBeenNthCalledWith(2, 0, 0, 0, 0);
  });

  it('presents the world target first (replacing the canvas) and the UI target second (blended on top)', () => {
    addCameraEntity(worldTarget, 0, Color.black);
    addCameraEntity(uiTarget, 1, Color.transparent);

    world.update();

    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      1,
      mockGl.TEXTURE_2D,
      worldTarget.colorTexture,
    );
    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      2,
      mockGl.TEXTURE_2D,
      uiTarget.colorTexture,
    );

    // The present pass disables blending before the first (replacing) draw
    // and enables it again before the second (blended) draw, so the UI
    // target's transparent pixels let the world target show through instead
    // of overwriting it with the UI's own clear color.
    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.blendFunc).toHaveBeenCalledWith(
      mockGl.SRC_ALPHA,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
  });

  it('draws a UI sprite into the UI target without touching the world target', () => {
    addCameraEntity(worldTarget, 0, Color.black);
    addCameraEntity(uiTarget, 1, Color.transparent);

    const geometry = { bind: vi.fn() } as unknown as Geometry;
    const material = {
      bind: vi.fn(),
      setUniform: vi.fn(),
      program: {} as WebGLProgram,
    } as unknown as Material;
    const renderable = new Renderable(
      geometry,
      material,
      4,
      0b0001,
      vi.fn(),
      vi.fn(),
    );

    // Both cameras share `cullingMask: 0xffffffff` here for simplicity, so
    // this sprite is drawn by both - what matters is that each camera draws
    // into its own render target rather than sharing one.
    const spriteEntity = world.createEntity();

    addPositionComponent(world, spriteEntity);
    addSpriteComponent(world, spriteEntity, {
      width: 10,
      height: 10,
      pivot: Vec2.zero,
      renderable,
    });

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      worldTarget.framebuffer,
    );
    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      uiTarget.framebuffer,
    );
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(2);
  });
});
