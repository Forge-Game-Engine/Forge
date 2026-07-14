import type {
  BindInstanceDataCallback,
  InstanceComponents,
  Renderable,
  SetupInstanceAttributesCallback,
} from '../renderable.js';

/**
 * A reusable, self-contained chunk of per-instance data.
 *
 * Segments describe how to bind a fixed number of floats into the instance
 * data buffer and how to wire those floats up to vertex attributes, relative
 * to an `offset` within the instance. Combine segments with
 * `combineInstanceDataSegments` to build the instance data layout for a
 * `Renderable`, allowing binding logic for a vertex shader's instance
 * attributes (e.g. the standard sprite layout) to be shared between sprites
 * with different fragment shaders, and extended with additional per-instance
 * attributes.
 */
export interface InstanceDataSegment {
  /**
   * The number of floats this segment occupies in the per-instance buffer.
   */
  readonly floatsPerInstance: number;

  /**
   * Writes this segment's data for an entity into `instanceDataBufferArray`,
   * starting at `offset` floats from the start of the instance.
   * @param components - The entity's components, resolved once per entity by the render system.
   * @param instanceDataBufferArray - The buffer to write into.
   * @param offset - The offset, in floats, of this segment within the instance.
   */
  bindInstanceData(
    components: InstanceComponents,
    instanceDataBufferArray: Float32Array,
    offset: number,
  ): void;

  /**
   * Configures the WebGL vertex attributes for this segment's data.
   * @param gl - The WebGL2 rendering context.
   * @param renderable - The renderable being configured.
   * @param offset - The offset, in floats, of this segment within the instance.
   */
  setupInstanceAttributes(
    gl: WebGL2RenderingContext,
    renderable: Renderable,
    offset: number,
  ): void;
}

/**
 * The combined instance data layout produced by `combineInstanceDataSegments`,
 * ready to be passed to a `Renderable`.
 */
export interface InstanceDataLayout {
  /**
   * The total number of floats per instance across all combined segments.
   */
  readonly floatsPerInstance: number;

  /**
   * Binds every segment's data for an entity into the instance data buffer.
   */
  readonly bindInstanceData: BindInstanceDataCallback;

  /**
   * Sets up the vertex attributes for every segment.
   */
  readonly setupInstanceAttributes: SetupInstanceAttributesCallback;
}

/**
 * Combines multiple instance data segments into a single layout, laying each
 * segment out sequentially within the per-instance buffer.
 *
 * @param segments - The segments to combine, in buffer order.
 * @returns The combined instance data layout.
 * @throws An error if no segments are provided.
 */
export function combineInstanceDataSegments(
  ...segments: InstanceDataSegment[]
): InstanceDataLayout {
  if (segments.length === 0) {
    throw new Error(
      'combineInstanceDataSegments requires at least one segment.',
    );
  }

  const segmentOffsets: number[] = [];
  let floatsPerInstance = 0;

  for (const segment of segments) {
    segmentOffsets.push(floatsPerInstance);
    floatsPerInstance += segment.floatsPerInstance;
  }

  const bindInstanceData: BindInstanceDataCallback = (
    components,
    instanceDataBufferArray,
    offset,
  ) => {
    segments.forEach((segment, index) => {
      segment.bindInstanceData(
        components,
        instanceDataBufferArray,
        offset + segmentOffsets[index],
      );
    });
  };

  const setupInstanceAttributes: SetupInstanceAttributesCallback = (
    gl,
    renderable,
  ) => {
    segments.forEach((segment, index) => {
      segment.setupInstanceAttributes(gl, renderable, segmentOffsets[index]);
    });
  };

  return { floatsPerInstance, bindInstanceData, setupInstanceAttributes };
}
