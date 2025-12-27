import { Entity } from '../../ecs';

export interface InstanceBatchOptions {
  initialBufferSize?: number;
  bufferGrowthFactor?: number;
}

const defaultOptions: Required<InstanceBatchOptions> = {
  initialBufferSize: 1000,
  bufferGrowthFactor: 2,
};

/**
 * Represents a batch of instances for rendering.
 */

export class InstanceBatch {
  /** The set of entities in this batch. */
  public entities: Set<Entity>;
  /** The buffer holding instance data. */
  public buffer: Float32Array;
  /** The initial size of the instance data array. */
  public initialBufferSize: number;
  /** The growth factor for the instance data array. */
  public bufferGrowthFactor: number;

  constructor(options: InstanceBatchOptions = {}) {
    const { initialBufferSize, bufferGrowthFactor } = {
      ...defaultOptions,
      ...options,
    };

    this.entities = new Set<Entity>();
    this.buffer = new Float32Array(initialBufferSize);
    this.initialBufferSize = initialBufferSize;
    this.bufferGrowthFactor = bufferGrowthFactor;
  }
}
