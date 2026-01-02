import { Entity } from '../../ecs/index.js';
import { Renderable } from '../renderable.js';
import { InstanceBatch } from './instance-batch.js';

/**
 * Represents a render layer that manages batches of entities for efficient rendering.
 *
 * A RenderLayer organizes entities by their renderable (which encapsulates geometry, material,
 * and rendering behavior) into instance batches. This allows for efficient instanced rendering
 * of multiple entities that share the same visual representation.
 *
 * @example
 * ```typescript
 * // Create a render layer with y-sorting enabled
 * const layer = new RenderLayer(true);
 *
 * // Add entities to the layer
 * layer.addEntity(spriteRenderable, entity1);
 * layer.addEntity(spriteRenderable, entity2);
 *
 * // Remove an entity when it's no longer visible
 * layer.removeEntity(spriteRenderable, entity1);
 * ```
 */
export class RenderLayer {
  /**
   * The map of renderables to their associated instance batches.
   *
   * Each renderable (unique combination of geometry, material, and rendering configuration)
   * maps to an InstanceBatch that contains all entities using that renderable.
   * This allows for efficient batched rendering of entities with the same visual properties.
   */
  public readonly renderables: Map<Renderable, InstanceBatch>;

  /**
   * Whether to sort entities by their y position before rendering.
   *
   * When enabled, entities will be sorted by their y-coordinate to achieve
   * proper depth ordering in 2D scenes (e.g., for isometric or top-down views).
   */
  public sortEntities: boolean;

  /**
   * Creates a new RenderLayer instance.
   *
   * @param sortEntities - Whether to sort entities by their y position before rendering.
   *                       Defaults to false if not specified.
   *
   * @example
   * ```typescript
   * // Create a layer without sorting
   * const layer1 = new RenderLayer();
   *
   * // Create a layer with y-sorting enabled
   * const layer2 = new RenderLayer(true);
   * ```
   */
  constructor(sortEntities: boolean = false) {
    this.sortEntities = sortEntities;
    this.renderables = new Map();
  }

  /**
   * Adds an entity to this render layer for a specific renderable.
   *
   * If this is the first entity for the given renderable, a new InstanceBatch
   * is automatically created. The entity is then added to the batch's set of entities.
   *
   * Adding the same entity multiple times to the same renderable has no effect,
   * as entities are stored in a Set.
   *
   * @param renderable - The renderable that defines how the entity should be rendered.
   * @param entity - The entity to add to this layer.
   *
   * @example
   * ```typescript
   * const layer = new RenderLayer();
   * const renderable = createSpriteRenderable(texture, material);
   *
   * layer.addEntity(renderable, playerEntity);
   * layer.addEntity(renderable, enemyEntity);
   * ```
   */
  public addEntity(renderable: Renderable, entity: Entity): void {
    if (!this.renderables.has(renderable)) {
      this.renderables.set(renderable, new InstanceBatch());
    }

    this.renderables.get(renderable)!.entities.add(entity);
  }

  /**
   * Removes an entity from this render layer for a specific renderable.
   *
   * The entity is removed from the renderable's InstanceBatch. If this was the last
   * entity using that renderable, the entire batch is removed to free up resources.
   *
   * This method is safe to call even if the renderable doesn't exist in this layer
   * or if the entity is not in the specified renderable's batch.
   *
   * @param renderable - The renderable associated with the entity.
   * @param entity - The entity to remove from this layer.
   *
   * @example
   * ```typescript
   * const layer = new RenderLayer();
   * layer.addEntity(renderable, entity);
   *
   * // Later, when the entity is destroyed or hidden
   * layer.removeEntity(renderable, entity);
   * ```
   */
  public removeEntity(renderable: Renderable, entity: Entity): void {
    if (this.renderables.has(renderable)) {
      this.renderables.get(renderable)!.entities.delete(entity);

      if (this.renderables.get(renderable)!.entities.size === 0) {
        this.renderables.delete(renderable);
      }
    }
  }
}
