import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RenderSystem } from './render-system';
import { Entity, World } from '../../ecs';
import { PositionComponent } from '../../common';
import { CameraComponent } from '../components';
import { RenderContext } from '../render-context';
import { RenderLayerComponent } from '../render-layers/render-layer-component';
import { RenderLayer } from '../render-layers/render-layer';
import { InstanceBatch } from '../render-layers/instance-batch';
import { Renderable } from '../renderable';
import { Material } from '../materials';
import { Geometry } from '../geometry';
import { Rect, Vector2 } from '../../math';

describe('RenderSystem', () => {
  let renderSystem: RenderSystem;
  let renderContext: RenderContext;
  let world: World;
  let gl: WebGL2RenderingContext;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock canvas
    canvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(),
    } as unknown as HTMLCanvasElement;

    // Create a mock WebGL2RenderingContext with all necessary methods
    gl = {
      /* eslint-disable @typescript-eslint/naming-convention */
      BLEND: 0x0be2,
      SRC_ALPHA: 0x0302,
      ONE_MINUS_SRC_ALPHA: 0x0303,
      COLOR_BUFFER_BIT: 0x4000,
      ARRAY_BUFFER: 0x8892,
      DYNAMIC_DRAW: 0x88e8,
      TRIANGLES: 0x0004,
      SCISSOR_TEST: 0x0c11,
      /* eslint-enable @typescript-eslint/naming-convention */
      enable: vi.fn(),
      blendFunc: vi.fn(),
      clear: vi.fn(),
      bindVertexArray: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      drawArraysInstanced: vi.fn(),
      scissor: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      canvas,
    } as unknown as WebGL2RenderingContext;

    // Create a mock RenderContext
    renderContext = {
      gl,
      canvas,
      shaderCache: new Map(),
      imageCache: new Map(),
      instanceBuffer: {},
      clearStrategy: 'blank',
      setGlobalUniformValue: vi.fn(),
      getGlobalUniformValue: vi.fn(),
    } as unknown as RenderContext;

    world = new World('test');
    renderSystem = new RenderSystem(renderContext);
  });

  describe('constructor', () => {
    it('should create a RenderSystem with correct query', () => {
      expect(renderSystem.query).toEqual([RenderLayerComponent]);
      expect(renderSystem.name).toBe('renderer');
    });

    it('should enable blending on initialization', () => {
      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
      expect(gl.blendFunc).toHaveBeenCalledWith(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
      );
    });
  });

  describe('beforeAll', () => {
    it('should sort entities by render layer order', () => {
      const renderLayer1 = new RenderLayer();
      const renderLayer2 = new RenderLayer();
      const renderLayer3 = new RenderLayer();

      const entity1 = new Entity(world, [
        new RenderLayerComponent(renderLayer1, 2),
      ]);
      const entity2 = new Entity(world, [
        new RenderLayerComponent(renderLayer2, 0),
      ]);
      const entity3 = new Entity(world, [
        new RenderLayerComponent(renderLayer3, 1),
      ]);

      const entities = [entity1, entity2, entity3];
      const sortedEntities = renderSystem.beforeAll(entities);

      expect(sortedEntities[0]).toBe(entity2); // order 0
      expect(sortedEntities[1]).toBe(entity3); // order 1
      expect(sortedEntities[2]).toBe(entity1); // order 2
    });

    it('should clear the color buffer', () => {
      const entities: Entity[] = [];
      renderSystem.beforeAll(entities);

      expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
    });

    it('should return the sorted entities array', () => {
      const renderLayer = new RenderLayer();
      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);
      const entities = [entity];

      const result = renderSystem.beforeAll(entities);

      expect(result).toBe(entities);
      expect(result.length).toBe(1);
    });
  });

  describe('run', () => {
    it('should bind vertex array to null after processing renderables', () => {
      const renderLayer = new RenderLayer();
      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
    });

    it('should process each renderable in the render layer', () => {
      const renderLayer = new RenderLayer();
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      // Create mock material and geometry
      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16, // floatsPerInstance
        vi.fn(),
        vi.fn(),
      );

      const batch = new InstanceBatch();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
    });

    it('should not render when render layer has no renderables', () => {
      const renderLayer = new RenderLayer();
      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should clear the color buffer when stopped', () => {
      renderSystem.stop();

      expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
    });
  });

  describe('_includeBatch', () => {
    it('should skip empty batches', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        vi.fn(),
        vi.fn(),
      );

      const batch = new InstanceBatch();
      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      // Should not call draw methods for empty batch
      expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    });

    it('should set up projection matrix and bind material', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(10, 20),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const bindInstanceData = vi.fn();
      const setupInstanceAttributes = vi.fn();

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        bindInstanceData,
        setupInstanceAttributes,
      );

      const batch = new InstanceBatch();
      const renderEntity = new Entity(world, [
        new PositionComponent(5, 5),
      ]);
      batch.entities.add(renderEntity);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      // Verify the projection matrix was set (it's a Matrix3x3 object)
      expect(material.setUniform).toHaveBeenCalledTimes(1);
      const calls = vi.mocked(material.setUniform).mock.calls;
      expect(calls[0][0]).toBe('u_projection');
      expect(calls[0][1]).toBeDefined();
      expect(typeof calls[0][1]).toBe('object');
      expect(material.bind).toHaveBeenCalledWith(gl);
      expect(geometry.bind).toHaveBeenCalledWith(gl, material.program);
    });

    it('should enable scissor test when camera has scissor rect', () => {
      const camera = new CameraComponent();
      camera.scissorRect = new Rect(
        new Vector2(0.25, 0.25),
        new Vector2(0.5, 0.5),
      );

      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        camera,
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        vi.fn(),
        vi.fn(),
      );

      const batch = new InstanceBatch();
      const renderEntity = new Entity(world, [
        new PositionComponent(0, 0),
      ]);
      batch.entities.add(renderEntity);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(gl.enable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
      expect(gl.scissor).toHaveBeenCalledWith(
        Math.floor(0.25 * 800), // origin.x * canvas.width
        Math.floor(0.25 * 600), // origin.y * canvas.height
        Math.floor(0.5 * 800), // size.x * canvas.width
        Math.floor(0.5 * 600), // size.y * canvas.height
      );
    });

    it('should allocate buffer if not present', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const bindInstanceData = vi.fn();
      const setupInstanceAttributes = vi.fn();

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16, // floatsPerInstance
        bindInstanceData,
        setupInstanceAttributes,
      );

      const batch = new InstanceBatch();
      const renderEntity = new Entity(world, [
        new PositionComponent(0, 0),
      ]);
      batch.entities.add(renderEntity);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(batch.buffer).toBeDefined();
      expect(batch.buffer.length).toBeGreaterThanOrEqual(16); // At least floatsPerInstance
    });

    it('should grow buffer if required size is larger', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        vi.fn(),
        vi.fn(),
      );

      const batch = new InstanceBatch();
      batch.buffer = new Float32Array(10); // Small buffer

      const renderEntity = new Entity(world, [
        new PositionComponent(0, 0),
      ]);
      batch.entities.add(renderEntity);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(batch.buffer.length).toBeGreaterThan(10); // Buffer grew
    });

    it('should call bindInstanceData for each entity', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const bindInstanceData = vi.fn();
      const setupInstanceAttributes = vi.fn();

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        bindInstanceData,
        setupInstanceAttributes,
      );

      const batch = new InstanceBatch();
      const entity1 = new Entity(world, [
        new PositionComponent(1, 1),
      ]);
      const entity2 = new Entity(world, [
        new PositionComponent(2, 2),
      ]);
      batch.entities.add(entity1);
      batch.entities.add(entity2);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(bindInstanceData).toHaveBeenCalledTimes(2);
      expect(bindInstanceData).toHaveBeenCalledWith(
        entity1,
        expect.any(Float32Array),
        0,
      );
      expect(bindInstanceData).toHaveBeenCalledWith(
        entity2,
        expect.any(Float32Array),
        16,
      );
    });

    it('should upload buffer data and draw instances', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const setupInstanceAttributes = vi.fn();

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        vi.fn(),
        setupInstanceAttributes,
      );

      const batch = new InstanceBatch();
      const renderEntity = new Entity(world, [
        new PositionComponent(0, 0),
      ]);
      batch.entities.add(renderEntity);

      const renderLayer = new RenderLayer();
      renderLayer.renderables.set(renderable, batch);

      const entity = new Entity(world, [
        new RenderLayerComponent(renderLayer, 0),
      ]);

      renderSystem.run(entity);

      expect(gl.bindBuffer).toHaveBeenCalledWith(
        gl.ARRAY_BUFFER,
        renderContext.instanceBuffer,
      );
      expect(gl.bufferData).toHaveBeenCalledWith(
        gl.ARRAY_BUFFER,
        expect.any(Float32Array),
        gl.DYNAMIC_DRAW,
      );
      expect(setupInstanceAttributes).toHaveBeenCalledWith(gl, renderable);
      expect(gl.drawArraysInstanced).toHaveBeenCalledWith(
        gl.TRIANGLES,
        0,
        6,
        1, // batch length
      );
    });
  });

  describe('integration', () => {
    it('should render multiple entities with multiple render layers in order', () => {
      const cameraEntity = new Entity(world, [
        new PositionComponent(0, 0),
        new CameraComponent(),
      ]);

      const material = {
        setUniform: vi.fn(),
        bind: vi.fn(),
        program: {},
      } as unknown as Material;

      const geometry = {
        bind: vi.fn(),
      } as unknown as Geometry;

      const renderable = new Renderable(
        geometry,
        material,
        cameraEntity,
        16,
        vi.fn(),
        vi.fn(),
      );

      // Create two render layers with different orders
      const renderLayer1 = new RenderLayer();
      const batch1 = new InstanceBatch();
      batch1.entities.add(
        new Entity(world, [new PositionComponent(1, 1)]),
      );
      renderLayer1.renderables.set(renderable, batch1);

      const renderLayer2 = new RenderLayer();
      const batch2 = new InstanceBatch();
      batch2.entities.add(
        new Entity(world, [new PositionComponent(2, 2)]),
      );
      renderLayer2.renderables.set(renderable, batch2);

      const entity1 = new Entity(world, [
        new RenderLayerComponent(renderLayer1, 1), // Higher order
      ]);
      const entity2 = new Entity(world, [
        new RenderLayerComponent(renderLayer2, 0), // Lower order
      ]);

      const entities = [entity1, entity2];
      const sortedEntities = renderSystem.beforeAll(entities);

      // Verify sorting
      expect(sortedEntities[0]).toBe(entity2);
      expect(sortedEntities[1]).toBe(entity1);

      // Run both
      renderSystem.run(sortedEntities[0]);
      renderSystem.run(sortedEntities[1]);

      expect(gl.drawArraysInstanced).toHaveBeenCalledTimes(2);
    });
  });
});
