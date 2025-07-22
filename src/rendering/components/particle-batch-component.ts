import { ParticleComponent } from '../../animations';
import type { Component } from '../../ecs';
import type { RenderLayer } from '../render-layers';
import type { Renderable } from '../renderable';

export interface ParticleBatch {
  particles: ParticleComponent[];
  instanceData: Float32Array | null;
}

/**
 * The `ParticleBatchComponent` class implements the `Component` interface and represents
 * a component that contains particle items that can be batched for rendering.
 */
export class ParticleBatchComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The map of batched particles. */
  public batches: Map<Renderable, ParticleBatch> = new Map();

  /** The render layer to which the batch belongs. */
  public readonly renderLayer: RenderLayer;

  /** A static symbol property that uniquely identifies the `ParticleBatchComponent`. */
  public static readonly symbol = Symbol('ParticleBatch');

  /**
   * Constructs a new instance of the `ParticleBatchComponent` class.
   */
  constructor(renderLayer: RenderLayer) {
    this.name = ParticleBatchComponent.symbol;
    this.renderLayer = renderLayer;
  }
}
