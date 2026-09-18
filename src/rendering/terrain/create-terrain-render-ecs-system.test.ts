/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createTerrainRenderEcsSystem } from './create-terrain-render-ecs-system';
import { addTerrainMeshComponent } from './components/index.js';
import type { TerrainMesh } from './create-terrain-mesh';
import { EcsWorld } from '../../ecs/index.js';
import { addPositionComponent } from '../../common/index.js';

import { addCameraComponent, CameraEcsComponent } from '../components/index.js';
import { CLEAR_STRATEGY } from '../enums/index.js';
import { ImageCache } from '../../asset-loading/index.js';
import { RenderContext } from '../render-context.js';
import { ShaderCache } from '../shaders/index.js';
import { Geometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { calculatePixelsPerUnit } from '../utilities/calculate-pixels-per-unit.js';
import { createProjectionMatrix } from '../shaders/index.js';

describe('createTerrainRenderEcsSystem', () => {
  let world: EcsWorld;
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let terrainMesh: TerrainMesh;
  let material: Material;
  let geometry: Geometry;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = {
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      TRIANGLES: 'TRIANGLES',
      bindFramebuffer: vi.fn(),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      drawArrays: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );

    material = {
      bind: vi.fn(),
      setUniform: vi.fn(),
      program: {} as WebGLProgram,
    } as unknown as Material;

    geometry = {
      bind: vi.fn(),
    } as unknown as Geometry;

    terrainMesh = { geometry, material, vertexCount: 42 };

    world = new EcsWorld();
    world.addSystem(createTerrainRenderEcsSystem(renderContext));
  });

  const addCamera = (overrides: Partial<CameraEcsComponent> = {}): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: { x: 10, y: 20 } });
    addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      ...overrides,
    });
  };

  const addTerrain = (overrides: Partial<{ category: number }> = {}): void => {
    const entity = world.createEntity();

    addTerrainMeshComponent(world, entity, { mesh: terrainMesh, ...overrides });
  };

  it('does not draw anything when there is no camera entity', () => {
    addTerrain();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('does not draw anything when there is no terrain mesh entity', () => {
    addCamera();

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('clears and draws the terrain mesh once per camera', () => {
    addCamera();
    addTerrain();

    world.update();

    expect(mockGl.clear).toHaveBeenCalledWith('COLOR_BUFFER_BIT');
    expect(material.bind).toHaveBeenCalledWith(mockGl);
    expect(geometry.bind).toHaveBeenCalledWith(mockGl, material.program);
    expect(mockGl.drawArrays).toHaveBeenCalledWith('TRIANGLES', 0, 42);
  });

  it('sets the projection matrix uniform before binding the material', () => {
    addCamera();
    addTerrain();

    world.update();

    expect(material.setUniform).toHaveBeenCalledWith(
      'u_projection',
      expect.anything(),
    );

    const setUniformOrder = (material.setUniform as Mock).mock
      .invocationCallOrder[0];
    const bindOrder = (material.bind as Mock).mock.invocationCallOrder[0];

    expect(setUniformOrder).toBeLessThan(bindOrder);
  });

  it('binds the canvas framebuffer when the camera has no render target', () => {
    addCamera();
    addTerrain();

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith('FRAMEBUFFER', null);
  });

  it('scales the projection matrix by the camera-derived pixels-per-unit', () => {
    addCamera({ verticalWorldUnits: 20 });
    addTerrain();

    world.update();

    const expectedPixelsPerUnit = calculatePixelsPerUnit(600, 20);
    const expectedMatrix = createProjectionMatrix(
      800,
      600,
      { x: 10, y: 20 },
      1,
      expectedPixelsPerUnit,
    );

    expect(material.setUniform).toHaveBeenCalledWith(
      'u_projection',
      expectedMatrix,
    );
  });

  it('draws once per camera when multiple cameras are present', () => {
    addCamera();
    addCamera();
    addTerrain();

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('draws once per terrain mesh entity when multiple are present', () => {
    addCamera();
    addTerrain();
    addTerrain();

    world.update();

    expect(mockGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('skips a terrain mesh whose category does not match the camera cullingMask', () => {
    addCamera({ cullingMask: 1 << 0 });
    addTerrain({ category: 1 << 1 });

    world.update();

    expect(mockGl.drawArrays).not.toHaveBeenCalled();
  });

  it('sets clearStrategy to none once a terrain mesh exists', () => {
    addCamera();
    addTerrain();

    world.update();

    expect(renderContext.clearStrategy).toBe(CLEAR_STRATEGY.none);
  });

  it('leaves clearStrategy untouched while there is no terrain mesh yet', () => {
    addCamera();

    world.update();

    expect(renderContext.clearStrategy).toBe(CLEAR_STRATEGY.blank);
  });
});
