/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresentEcsSystem } from './present-system';
import { EcsWorld } from '../../ecs';
import { addCameraComponent, CameraEcsComponent } from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { Texture } from '../texture';
import { ImageCache } from '../../asset-loading';
import {
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  ShaderCache,
} from '../shaders';

describe('createPresentEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  const addCameraEntity = (
    renderTarget?: CameraEcsComponent['renderTarget'],
    layer: number = 0,
  ): CameraEcsComponent => {
    const entity = world.createEntity();

    return addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      renderTarget,
      layer,
    });
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
      ONE: 'ONE',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',

      disable: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

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
      bindTexture: vi.fn(),
      createTexture: vi.fn().mockImplementation(() => ({})),
      texParameteri: vi.fn(),

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
      getExtension: vi.fn(() => null),
      isContextLost: vi.fn(() => false),
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      target.colorTexture.glTexture,
    );
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, 6);
  });

  it('presents multiple cameras independently', () => {
    const targetA = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA);
    addCameraEntity(targetB);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
    // Render targets hold premultiplied color, so the source factor is ONE:
    // SRC_ALPHA would multiply the layer's alpha in a second time.
    expect(mockGl.blendFunc).toHaveBeenCalledWith(
      mockGl.ONE,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
    expect(mockGl.blendFunc).not.toHaveBeenCalledWith(
      mockGl.SRC_ALPHA,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
  });

  it('blends every layer over the canvas, without clearing it, when a camera renders straight to the canvas', () => {
    const uiTarget = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;

    // A world camera drawing straight onto the canvas (already cleared and
    // drawn by the render system by the time the present pass runs), plus
    // a UI camera with its own render target.
    addCameraEntity(undefined, 0);
    addCameraEntity(uiTarget, 1);

    world.update();

    expect(mockGl.clear).not.toHaveBeenCalled();
    // Blending is on for the draw itself (only switched back off once the
    // pass is done), so the UI target composites over the world instead of
    // replacing it.
    expect(vi.mocked(mockGl.enable).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mockGl.drawArrays).mock.invocationCallOrder[0],
    );
    expect(
      vi.mocked(mockGl.disable).mock.invocationCallOrder[0],
    ).toBeGreaterThan(vi.mocked(mockGl.drawArrays).mock.invocationCallOrder[0]);
    expect(mockGl.blendFunc).toHaveBeenCalledWith(
      mockGl.ONE,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      null,
    );
    expect(mockGl.bindTexture).toHaveBeenCalledWith(
      mockGl.TEXTURE_2D,
      uiTarget.colorTexture.glTexture,
    );
    expect(mockGl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it('presents in ascending layer order regardless of camera creation order', () => {
    const background = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const foreground = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 64,
      height: 64,
    } as RenderTarget;

    // The foreground camera (higher layer) is added first, but its target
    // must still be presented second, since layer (not creation order)
    // determines draw order.
    addCameraEntity(foreground, 1);
    addCameraEntity(background, 0);

    // Creating each target's texture binds it; only count the present pass.
    vi.mocked(mockGl.bindTexture).mockClear();

    world.update();

    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      1,
      mockGl.TEXTURE_2D,
      background.colorTexture.glTexture,
    );
    expect(mockGl.bindTexture).toHaveBeenNthCalledWith(
      2,
      mockGl.TEXTURE_2D,
      foreground.colorTexture.glTexture,
    );
  });

  it('clears the canvas again on the next frame', () => {
    const targetA = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
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
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;

    addCameraEntity(target);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(vi.mocked(mockGl.disable).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mockGl.drawArrays).mock.invocationCallOrder[0],
    );
  });

  it('leaves blending disabled once every layer has been presented', () => {
    const targetA = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 128,
      height: 128,
    } as RenderTarget;
    const targetB = {
      colorTexture: new Texture(renderContext),
      framebuffer: {},
      width: 64,
      height: 64,
    } as RenderTarget;

    addCameraEntity(targetA, 0);
    addCameraEntity(targetB, 1);

    world.update();

    const lastDisable = vi
      .mocked(mockGl.disable)
      .mock.invocationCallOrder.at(-1)!;
    const lastEnable = vi
      .mocked(mockGl.enable)
      .mock.invocationCallOrder.at(-1)!;
    const lastDraw = vi
      .mocked(mockGl.drawArrays)
      .mock.invocationCallOrder.at(-1)!;

    expect(lastDisable).toBeGreaterThan(lastEnable);
    expect(lastDisable).toBeGreaterThan(lastDraw);
  });
});
