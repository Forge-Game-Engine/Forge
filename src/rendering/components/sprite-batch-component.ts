import {
  type OrNull,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common';
import type { Component } from '../../ecs';
import type { Vector2 } from '../../math';
import type { RenderLayer } from '../render-layers';
import type { Renderable } from '../renderable';

export interface Batchable {
  renderable: Renderable;
  position: PositionComponent;
  width: number;
  height: number;
  pivot: Vector2;
  rotation: OrNull<RotationComponent>;
  scale: OrNull<ScaleComponent>;
}

export type Batch = Batchable[];

/**
 * The `RenderableBatchComponent` class implements the `Component` interface and represents
 * a component that contains a items that can be batched for rendering.
 */
export class RenderableBatchComponent implements Component {
  /** The name property holds the unique symbol for this component. */
  public name: symbol;

  /** The map of batched entities. */
  public batches: Map<Renderable, Batch> = new Map();

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
  }
}
