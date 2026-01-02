import { Entity } from '../../ecs/index.js';
import { Renderable } from '../renderable.js';
import { InstanceBatch } from './instance-batch.js';

/**
 * Manages batches of entities for efficient instanced rendering.
 */
export class RenderLayer {
  /** The map of renderables to their associated instance batches. */
  public readonly renderables: Map<Renderable, InstanceBatch>;

  /** Whether to sort entities by their y position before rendering. */
  public sortEntities: boolean;

  /**
   * Creates a new RenderLayer instance.
   * @param sortEntities - Whether to sort entities by their y position before rendering. Defaults to false.
   */
  constructor(sortEntities: boolean = false) {
    this.sortEntities = sortEntities;
    this.renderables = new Map();
  }

  /**
   * Adds an entity to this render layer for a specific renderable.
   * @param renderable - The renderable that defines how the entity should be rendered.
   * @param entity - The entity to add to this layer.
   */
  public addEntity(renderable: Renderable, entity: Entity): void {
    if (!this.renderables.has(renderable)) {
      this.renderables.set(renderable, new InstanceBatch());
    }

    this.renderables.get(renderable)!.entities.add(entity);
  }

  /**
   * Removes an entity from this render layer for a specific renderable.
   * @param renderable - The renderable associated with the entity.
   * @param entity - The entity to remove from this layer.
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
