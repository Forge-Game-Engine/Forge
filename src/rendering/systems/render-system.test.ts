/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createRenderEcsSystem } from './render-system';
import { EcsWorld } from '../../ecs';
import { PositionEcsComponent, positionId, rotationId } from '../../common';
import { Vector2 } from '../../math';
import { CameraEcsComponent, cameraId } from '../components';
import { SpriteEcsComponent, spriteId } from '../components';
import { Renderable } from '../renderable';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { Color } from '../color';
import { Geometry } from '../geometry/geometry';
import { Material } from '../materials/material';
import { ShaderCache } from '../shaders';
import { ImageCache } from '../../asset-loading';
import { createProjectionMatrix } from '../shaders';

describe('createRenderEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  const createRenderable = (
    floatsPerInstance: number,
  ): {
    renderable: Renderable;
    material: Material;
    geometry: Geometry;
    bindInstanceData: Mock;
    setupInstanceAttributes: Mock;
  } => {
    const material = {
      bind: vi.fn(),
      setUniform: vi.fn(),
      program: {} as WebGLProgram,
    } as unknown as Material;

    const geometry = {
      bind: vi.fn(),
    } as unknown as Geometry;

    const bindInstanceData = vi.fn();
    const setupInstanceAttributes = vi.fn();

    const renderable = new Renderable(
      geometry,
      material,
      floatsPerInstance,
      0b0001,
      bindInstanceData,
      setupInstanceAttributes,
    );

    return {
      renderable,
      material,
      geometry,
      bindInstanceData,
      setupInstanceAttributes,
    };
  };

  const createCamera = (
    cullingMask: number = 0xffffffff,
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): CameraEcsComponent => ({
    zoom: 1,
    zoomSensitivity: 0.1,
    panSensitivity: 1,
    minZoom: 0.0001,
    maxZoom: 10000,
    isStatic: true,
    cullingMask,
    renderTarget,
    layer: 0,
    clearColor: Color.transparent,
  });

  const createSprite = (
    renderable: Renderable,
    overrides: Partial<SpriteEcsComponent> = {},
  ): SpriteEcsComponent => ({
    width: 1,
    height: 1,
    pivot: Vector2.zero,
    tintColor: new Color(1, 1, 1, 1),
    renderable,
    uvOffset: Vector2.zero,
    uvScale: Vector2.zero,
    enabled: true,
    layer: 0,
    ...overrides,
  });

  const addCameraEntity = (
    cullingMask: number = 0xffffffff,
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): CameraEcsComponent => {
    const entity = world.createEntity();
    const camera = createCamera(cullingMask, renderTarget);

    world.addComponent(entity, cameraId, camera);
    world.addComponent(entity, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });

    return camera;
  };

  const addSpriteEntity = (
    renderable: Renderable,
    worldY: number,
    overrides: Partial<SpriteEcsComponent> = {},
  ): number => {
    const entity = world.createEntity();
    const position: PositionEcsComponent = {
      local: new Vector2(0, worldY),
      world: new Vector2(0, worldY),
    };

    world.addComponent(entity, positionId, position);
    world.addComponent(entity, spriteId, createSprite(renderable, overrides));

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = {
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      blendFunc: vi.fn(),
      drawArraysInstanced: vi.fn(),
      viewport: vi.fn(),
      bindFramebuffer: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      BLEND: 'BLEND',
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
    world = new EcsWorld();
    world.addSystem(createRenderEcsSystem(renderContext));
  });

  it('does not draw anything when there is no camera entity', () => {
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('does not draw anything when there are no sprite entities', () => {
    addCameraEntity();

    world.update();

    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('skips disabled sprites', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable(4);

    addSpriteEntity(renderable, 0, { enabled: false });

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();
    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('skips sprites whose renderable category does not match the camera culling mask', () => {
    addCameraEntity(0b0010);
    const { renderable, bindInstanceData } = createRenderable(4);

    renderable.category = 0b0001;
    addSpriteEntity(renderable, 0);

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();
    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('draws sprites whose renderable category matches the camera culling mask', () => {
    addCameraEntity(0b0011);
    const { renderable, bindInstanceData } = createRenderable(4);

    renderable.category = 0b0001;
    addSpriteEntity(renderable, 0);

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(1);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
  });

  it('uses the render context dimensions (not the canvas dimensions) for the projection matrix', () => {
    addCameraEntity();
    const { renderable, material } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    renderContext.resize(400, 200);
    // Change the canvas' own dimensions to confirm they are no longer read directly.
    canvas.width = 999;
    canvas.height = 999;

    world.update();

    const expected = createProjectionMatrix(400, 200, Vector2.zero, 1);

    expect(material.setUniform).toHaveBeenCalledWith('u_projection', expected);
  });

  it('batches consecutive sprites that share a renderable into a single draw call', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable(4);

    addSpriteEntity(renderable, 0);
    addSpriteEntity(renderable, 1);

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(2);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledWith(undefined, 0, 6, 2);
    expect(mockGl.bufferData).toHaveBeenCalledTimes(1);

    const bindOffsets = bindInstanceData.mock.calls.map(
      (call) => call[2] as number,
    );

    expect(bindOffsets).toEqual([0, 4]);
  });

  it('sorts render commands by world Y (depth) before drawing', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable(4);

    addSpriteEntity(renderable, 10);
    addSpriteEntity(renderable, -5);
    addSpriteEntity(renderable, 2);

    world.update();

    const drawnDepths = bindInstanceData.mock.calls.map(
      (call) =>
        (call[0] as { position: PositionEcsComponent }).position.world.y,
    );

    expect(drawnDepths).toEqual([-5, 2, 10]);
  });

  it("sorts render commands by the sprite's layer before depth", () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable(4);

    addSpriteEntity(renderable, 10, { layer: 0 });
    addSpriteEntity(renderable, -5, { layer: 1 });
    addSpriteEntity(renderable, 2, { layer: 0 });

    world.update();

    const drawnDepths = bindInstanceData.mock.calls.map(
      (call) =>
        (call[0] as { position: PositionEcsComponent }).position.world.y,
    );

    // Layer 0 entries (depths 10 and 2) are drawn before the layer 1 entry
    // (depth -5), even though -5 sorts lowest by depth alone.
    expect(drawnDepths).toEqual([2, 10, -5]);
  });

  it('disables blending after drawing a camera', () => {
    addCameraEntity();
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  it('splits into separate draw calls when sprites with different renderables interleave by depth', () => {
    addCameraEntity();
    const a = createRenderable(4);
    const b = createRenderable(4);

    addSpriteEntity(a.renderable, 0);
    addSpriteEntity(b.renderable, 1);
    addSpriteEntity(a.renderable, 2);

    world.update();

    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(3);
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      1,
      undefined,
      0,
      6,
      1,
    );
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      2,
      undefined,
      0,
      6,
      1,
    );
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      3,
      undefined,
      0,
      6,
      1,
    );
    expect(a.bindInstanceData).toHaveBeenCalledTimes(2);
    expect(b.bindInstanceData).toHaveBeenCalledTimes(1);
  });

  it('draws once per camera entity, using each camera projection', () => {
    addCameraEntity();
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(2);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(2);
  });

  it('binds the default framebuffer and clears before drawing a camera with no render target', () => {
    addCameraEntity();
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      null,
    );
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
  });

  it("binds the camera's render target framebuffer and clears before drawing", () => {
    const target = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, target);
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
    expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 128, 128);
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
  });

  it('clears the canvas only once when multiple cameras share it', () => {
    addCameraEntity();
    addCameraEntity();
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(1);
  });

  it('clears each distinct render target once when cameras target different buffers', () => {
    const targetA = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;
    const targetB = {
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, targetA);
    addCameraEntity(0xffffffff, targetB);
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(2);
  });

  it('clears a render target only once when multiple cameras share it', () => {
    const sharedTarget = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, sharedTarget);
    addCameraEntity(0xffffffff, sharedTarget);
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(1);
  });

  it('clears again on the next frame', () => {
    addCameraEntity();
    const { renderable } = createRenderable(4);

    addSpriteEntity(renderable, 0);

    world.update();
    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(2);
  });

  describe('nine-slice sprites', () => {
    it('draws a sliced sprite as nine batched instances of the same renderable', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable(4);

      addSpriteEntity(renderable, 0, {
        width: 100,
        height: 100,
        pivot: new Vector2(0.5, 0.5),
        slices: { left: 10, right: 10, top: 10, bottom: 10 },
      });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(9);
      // All nine regions share the same renderable, so they still batch
      // into a single draw call.
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledWith(
        undefined,
        0,
        6,
        9,
      );
    });

    it('positions each region around the entity, accounting for rotation', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable(4);

      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: new Vector2(50, 0),
        world: new Vector2(50, 0),
      });
      world.addComponent(entity, rotationId, { local: 0, world: Math.PI });
      world.addComponent(
        entity,
        spriteId,
        createSprite(renderable, {
          width: 100,
          height: 100,
          pivot: new Vector2(0.5, 0.5),
          slices: { left: 10, right: 10, top: 10, bottom: 10 },
        }),
      );

      world.update();

      const positions = bindInstanceData.mock.calls.map(
        (call) => (call[0] as { position: PositionEcsComponent }).position,
      );

      // The top-left corner (offset (-45, -45) before rotation) rotates 180
      // degrees around the entity, landing on the opposite side.
      const rotatedCorner = positions.find(
        (position) =>
          Math.abs(position.world.x - (50 + 45)) < 1e-9 &&
          Math.abs(position.world.y - 45) < 1e-9,
      );

      expect(rotatedCorner).toBeDefined();
    });

    it('does not slice a sprite with no `slices` configured', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable(4);

      addSpriteEntity(renderable, 0, { width: 100, height: 100 });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(1);
    });
  });
});
