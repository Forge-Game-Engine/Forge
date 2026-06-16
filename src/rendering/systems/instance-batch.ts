import type { InstanceComponents } from '../renderable.js';

export interface InstanceBatchOptions {
  initialBufferSize?: number;
  bufferGrowthFactor?: number;
}

const defaultOptions: Required<InstanceBatchOptions> = {
  initialBufferSize: 1000,
  bufferGrowthFactor: 1.2,
};

/**
 * Represents a batch of instances for rendering.
 */

export class InstanceBatch<TComponents = InstanceComponents> {
  /** The resolved components of each entity in this batch. */
  public entries: TComponents[];
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

    this.entries = [] as TComponents[];
    this.buffer = new Float32Array(initialBufferSize);
    this.initialBufferSize = initialBufferSize;
    this.bufferGrowthFactor = bufferGrowthFactor;
  }
}
