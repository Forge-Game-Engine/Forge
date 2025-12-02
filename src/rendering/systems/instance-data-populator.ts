import type { Entity } from '../../ecs/index.js';

/**
 * Defines the specification for an instance attribute in the shader.
 */
export interface InstanceAttributeSpec {
  /** The attribute name in the shader */
  name: string;
  /** Number of components (1 for float, 2 for vec2, etc.) */
  numComponents: number;
  /** Offset in floats from the start of the instance data */
  offset: number;
}

/**
 * Interface for populating instance data for different renderable types.
 * This allows different renderables to define their own instance data layout
 * and attribute configuration.
 */
export interface InstanceDataPopulator {
  /**
   * Returns the number of floats per instance.
   */
  readonly floatsPerInstance: number;

  /**
   * Returns the specifications for all instance attributes.
   */
  readonly attributeSpecs: InstanceAttributeSpec[];

  /**
   * Populates instance data for a single entity.
   * @param instanceData - The Float32Array to populate
   * @param offset - The offset in the array where this entity's data starts
   * @param entity - The entity to populate data for
   */
  populateInstanceData(
    instanceData: Float32Array,
    offset: number,
    entity: Entity,
  ): void;
}
