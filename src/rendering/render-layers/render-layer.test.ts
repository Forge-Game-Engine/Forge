import { beforeEach, describe, expect, it } from 'vitest';
import { RenderLayer } from './render-layer';
import { Entity, World } from '../../ecs';
import { Renderable } from '../renderable';

describe('RenderLayer', () => {
  let renderLayer: RenderLayer;
  let world: World;
  let entity1: Entity;
  let entity2: Entity;
  let mockRenderable: Renderable;

  beforeEach(() => {
    world = new World('test');
    entity1 = new Entity(world, []);
    entity2 = new Entity(world, []);

    // Create a minimal mock Renderable with required properties
    mockRenderable = {
      geometry: {},
      material: {},
      cameraEntity: entity1,
      floatsPerInstance: 16,
      bindInstanceData: () => {},
      setupInstanceAttributes: () => {},
      bind: () => {},
    } as unknown as Renderable;
  });

  describe('constructor', () => {
    it('should create a RenderLayer with default sortEntities as false', () => {
      renderLayer = new RenderLayer();

      expect(renderLayer.sortEntities).toBe(false);
      expect(renderLayer.renderables).toBeInstanceOf(Map);
      expect(renderLayer.renderables.size).toBe(0);
    });

    it('should create a RenderLayer with sortEntities set to true', () => {
      renderLayer = new RenderLayer(true);

      expect(renderLayer.sortEntities).toBe(true);
      expect(renderLayer.renderables).toBeInstanceOf(Map);
    });

    it('should create a RenderLayer with sortEntities set to false explicitly', () => {
      renderLayer = new RenderLayer(false);

      expect(renderLayer.sortEntities).toBe(false);
    });
  });

  describe('addEntity', () => {
    beforeEach(() => {
      renderLayer = new RenderLayer();
    });

    it('should add an entity to a new renderable', () => {
      renderLayer.addEntity(mockRenderable, entity1);

      expect(renderLayer.renderables.has(mockRenderable)).toBe(true);
      const batch = renderLayer.renderables.get(mockRenderable);
      expect(batch).toBeDefined();
      expect(batch!.entities.has(entity1)).toBe(true);
      expect(batch!.entities.size).toBe(1);
    });

    it('should add multiple entities to the same renderable', () => {
      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.addEntity(mockRenderable, entity2);

      const batch = renderLayer.renderables.get(mockRenderable);
      expect(batch).toBeDefined();
      expect(batch!.entities.has(entity1)).toBe(true);
      expect(batch!.entities.has(entity2)).toBe(true);
      expect(batch!.entities.size).toBe(2);
    });

    it('should create separate batches for different renderables', () => {
      const mockRenderable2 = { ...mockRenderable } as Renderable;

      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.addEntity(mockRenderable2, entity2);

      expect(renderLayer.renderables.size).toBe(2);
      expect(
        renderLayer.renderables.get(mockRenderable)!.entities.has(entity1),
      ).toBe(true);
      expect(
        renderLayer.renderables.get(mockRenderable2)!.entities.has(entity2),
      ).toBe(true);
    });

    it('should handle adding the same entity multiple times to the same renderable', () => {
      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.addEntity(mockRenderable, entity1);

      const batch = renderLayer.renderables.get(mockRenderable);
      // Set should only contain one instance of entity1
      expect(batch!.entities.size).toBe(1);
      expect(batch!.entities.has(entity1)).toBe(true);
    });
  });

  describe('removeEntity', () => {
    beforeEach(() => {
      renderLayer = new RenderLayer();
    });

    it('should remove an entity from a renderable', () => {
      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.removeEntity(mockRenderable, entity1);

      // The batch should be removed when empty
      expect(renderLayer.renderables.has(mockRenderable)).toBe(false);
    });

    it('should keep the batch if other entities remain', () => {
      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.addEntity(mockRenderable, entity2);
      renderLayer.removeEntity(mockRenderable, entity1);

      expect(renderLayer.renderables.has(mockRenderable)).toBe(true);
      const batch = renderLayer.renderables.get(mockRenderable);
      expect(batch!.entities.has(entity1)).toBe(false);
      expect(batch!.entities.has(entity2)).toBe(true);
      expect(batch!.entities.size).toBe(1);
    });

    it('should remove the batch when the last entity is removed', () => {
      renderLayer.addEntity(mockRenderable, entity1);
      renderLayer.addEntity(mockRenderable, entity2);
      renderLayer.removeEntity(mockRenderable, entity1);
      renderLayer.removeEntity(mockRenderable, entity2);

      expect(renderLayer.renderables.has(mockRenderable)).toBe(false);
      expect(renderLayer.renderables.size).toBe(0);
    });

    it('should handle removing an entity from a non-existent renderable gracefully', () => {
      expect(() => {
        renderLayer.removeEntity(mockRenderable, entity1);
      }).not.toThrow();

      expect(renderLayer.renderables.size).toBe(0);
    });

    it('should handle removing a non-existent entity from an existing renderable gracefully', () => {
      renderLayer.addEntity(mockRenderable, entity1);

      expect(() => {
        renderLayer.removeEntity(mockRenderable, entity2);
      }).not.toThrow();

      const batch = renderLayer.renderables.get(mockRenderable);
      expect(batch!.entities.size).toBe(1);
      expect(batch!.entities.has(entity1)).toBe(true);
    });
  });

  describe('renderables property', () => {
    beforeEach(() => {
      renderLayer = new RenderLayer();
    });

    it('should be readonly and not allow reassignment', () => {
      const originalMap = renderLayer.renderables;
      renderLayer.addEntity(mockRenderable, entity1);

      // The same map instance should be used
      expect(renderLayer.renderables).toBe(originalMap);
    });
  });
});
