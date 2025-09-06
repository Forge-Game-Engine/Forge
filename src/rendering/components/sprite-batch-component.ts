import type { Component, Entity } from '../../ecs';
import type { RenderLayer } from '../render-layers';
import type { Renderable } from '../renderable';

export interface Batch {
  entities: Entity[];
  instanceData: Float32Array | null;
}

/**
 * The `RenderableBatchComponent` class implements the `Component` interface and represents
 * a component that contains a items that can be batched for rendering.
 */
export class RenderableBatchComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The map of batched entities. */
  public batches: Map<Renderable, Batch>;

  /** The render layer to which the batch belongs. */
  public readonly renderLayer: RenderLayer;

  /** A static symbol property that uniquely identifies the `RenderableBatchComponent`. */
  public static readonly symbol = Symbol('RenderableBatch');

  /**
   * Constructs a new instance of the `RenderableBatchComponent` class.
   */
  constructor(renderLayer: RenderLayer) {
    this.name = RenderableBatchComponent.symbol;
    this.renderLayer = renderLayer;
    this.batches = new Map();
  }
}
