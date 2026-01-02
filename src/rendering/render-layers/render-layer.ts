import { Entity } from '../../ecs/index.js';
import { Renderable } from '../renderable.js';
import { InstanceBatch } from './instance-batch.js';

export class RenderLayer {
  /** The map of renderables to their associated instance batches. */
  public readonly renderables: Map<Renderable, InstanceBatch>;

  /** Whether to sort entities by their y position before rendering. */
  public sortEntities: boolean;

  constructor(sortEntities: boolean = false) {
    this.sortEntities = sortEntities;
    this.renderables = new Map();
  }

  public addEntity(renderable: Renderable, entity: Entity): void {
    if (!this.renderables.has(renderable)) {
      this.renderables.set(renderable, new InstanceBatch());
    }

    this.renderables.get(renderable)!.entities.add(entity);
  }

  public removeEntity(renderable: Renderable, entity: Entity): void {
    if (this.renderables.has(renderable)) {
      this.renderables.get(renderable)!.entities.delete(entity);

      if (this.renderables.get(renderable)!.entities.size === 0) {
        this.renderables.delete(renderable);
      }
    }
  }
}
