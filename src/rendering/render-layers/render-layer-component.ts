import { Renderable } from '../renderable.js';
import { Entity } from '../../ecs/entity.js';
import { Component } from '../../ecs/index.js';
import { InstanceBatch } from './instance-batch.js';

interface RenderLayerComponentOptions {
  sortEntities?: boolean;
  order?: number;
}

const defaultOptions: Required<RenderLayerComponentOptions> = {
  sortEntities: false,
  order: 0,
};

/**
 * The `ForgeRenderLayer` class represents a rendering layer with its own canvas and WebGL context.
 */
export class RenderLayerComponent extends Component {
  /** The order of the render layer (lower numbers are rendered first). */
  public order: number;

  /** Whether to sort entities by their y position before rendering. */
  public sortEntities: boolean;

  /** The map of renderables to their associated instance batches. */
  public readonly renderables: Map<Renderable, InstanceBatch>;

  /**
   * Constructs a new instance of the `RenderLayerComponent` class.
   * @param options - The options for configuring the render layer.
   * @throws An error if the WebGL2 context is not found.
   */
  constructor(options: RenderLayerComponentOptions = {}) {
    super();

    const { order, sortEntities } = {
      ...defaultOptions,
      ...options,
    };

    this.order = order;

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
