import type { GpuBindGroup } from './gpu-bind-group.js';
import type { GpuBuffer } from './gpu-buffer.js';
import type { GpuRenderPipeline } from './gpu-render-pipeline.js';
import type { GpuTexture, GpuTextureView } from './gpu-texture.js';

/**
 * What a render pass does with an attachment's contents when it begins:
 * keep them, or clear them.
 */
export type GpuLoadOp = 'load' | 'clear';

/**
 * What a render pass does with an attachment's contents when it ends: keep
 * them for later passes, or discard them (which saves memory bandwidth on
 * the tile-based GPUs in phones).
 */
export type GpuStoreOp = 'store' | 'discard';

/** A texture or a view of one of its mip levels and layers. */
export type GpuAttachmentView = GpuTexture | GpuTextureView;

/** One color attachment of a render pass. */
export interface GpuRenderPassColorAttachment {
  /** What's rendered into. */
  view: GpuAttachmentView;

  /**
   * A single-sampled texture of the same format and size that a
   * multisampled `view` is resolved into when the pass ends.
   */
  resolveTarget?: GpuAttachmentView;

  /** What the pass does with `view`'s contents when it begins. */
  loadOp: GpuLoadOp;

  /**
   * The value `loadOp: 'clear'` writes, as it's stored (premultiplied, for
   * the engine's destinations). Defaults to `[0, 0, 0, 0]`.
   */
  clearValue?: readonly [number, number, number, number];

  /** What the pass does with `view`'s contents when it ends. */
  storeOp: GpuStoreOp;
}

/** The depth (and stencil) attachment of a render pass. */
export interface GpuRenderPassDepthStencilAttachment {
  /** The depth texture rendered into. */
  view: GpuAttachmentView;

  /** What the pass does with the depths when it begins. Defaults to `'load'`. */
  depthLoadOp?: GpuLoadOp;

  /** The depth `depthLoadOp: 'clear'` writes. Defaults to `1`. */
  depthClearValue?: number;

  /** What the pass does with the depths when it ends. Defaults to `'store'`. */
  depthStoreOp?: GpuStoreOp;

  /**
   * What the pass does with the stencil values when it begins. Defaults to
   * `'load'`.
   */
  stencilLoadOp?: GpuLoadOp;

  /** The value `stencilLoadOp: 'clear'` writes. Defaults to `0`. */
  stencilClearValue?: number;

  /**
   * What the pass does with the stencil values when it ends. Defaults to
   * `'store'`.
   */
  stencilStoreOp?: GpuStoreOp;
}

/** Describes a render pass for `GpuCommandEncoder.beginRenderPass`. */
export interface GpuRenderPassDescriptor {
  /** The color attachments, at fragment outputs `0` and up. */
  colorAttachments: readonly GpuRenderPassColorAttachment[];

  /** The depth (and stencil) attachment. */
  depthStencilAttachment?: GpuRenderPassDepthStencilAttachment;

  /** A name for the pass, used in error messages. */
  label?: string;
}

/** The type of the indices in an index buffer. */
export type GpuIndexFormat = 'uint16' | 'uint32';

/**
 * Records draws into a render pass. On WebGL2 each call takes effect
 * immediately; state is applied when a draw needs it, and only what
 * changed is sent to the GPU. Viewport and scissor coordinates are in
 * attachment pixels from the bottom-left corner, Y up.
 *
 * While the WebGL context is lost, every call does nothing.
 */
export interface GpuRenderPassEncoder {
  /**
   * Sets the pipeline the next draws use.
   * @param pipeline - The pipeline.
   */
  setPipeline(pipeline: GpuRenderPipeline): void;

  /**
   * Sets the bind group a slot holds for the next draws.
   * @param index - The slot (see `bindGroupSlots`).
   * @param bindGroup - The bind group, made with the layout the pipelines
   * drawn with have at `index`.
   * @param dynamicOffsets - One offset per binding with
   * `hasDynamicOffset`, in binding order, each a multiple of the device's
   * `uniformBufferOffsetAlignment`.
   */
  setBindGroup(
    index: number,
    bindGroup: GpuBindGroup,
    dynamicOffsets?: readonly number[],
  ): void;

  /**
   * Sets the buffer a vertex buffer slot reads.
   * @param slot - The slot, an index into the pipeline's `vertexBuffers`.
   * @param buffer - A `'vertex'` buffer.
   * @param offset - The byte offset of the first vertex. Defaults to `0`.
   */
  setVertexBuffer(slot: number, buffer: GpuBuffer, offset?: number): void;

  /**
   * Sets the index buffer `drawIndexed` reads.
   * @param buffer - An `'index'` buffer.
   * @param format - The type of its indices.
   * @param offset - The byte offset of the first index. Defaults to `0`.
   */
  setIndexBuffer(
    buffer: GpuBuffer,
    format: GpuIndexFormat,
    offset?: number,
  ): void;

  /**
   * Sets the region drawn into, and the depth range. Defaults to the whole
   * attachment and `[0, 1]` when the pass begins.
   * @param x - The left edge, in pixels.
   * @param y - The bottom edge, in pixels.
   * @param width - The width, in pixels.
   * @param height - The height, in pixels.
   * @param minDepth - The depth clip-space `-1` maps to.
   * @param maxDepth - The depth clip-space `1` maps to.
   */
  setViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    minDepth: number,
    maxDepth: number,
  ): void;

  /**
   * Restricts drawing to a rectangle. The whole attachment when the pass
   * begins.
   * @param x - The left edge, in pixels.
   * @param y - The bottom edge, in pixels.
   * @param width - The width, in pixels.
   * @param height - The height, in pixels.
   */
  setScissorRect(x: number, y: number, width: number, height: number): void;

  /**
   * Sets the color the `'constant'` blend factors use.
   * @param color - Red, green, blue and alpha.
   */
  setBlendConstant(color: readonly [number, number, number, number]): void;

  /**
   * Sets the reference value of the stencil test.
   * @param reference - The reference value.
   */
  setStencilReference(reference: number): void;

  /**
   * Draws vertices from the vertex buffers.
   * @param vertexCount - The number of vertices.
   * @param instanceCount - The number of instances. Defaults to `1`.
   * @param firstVertex - The first vertex. Defaults to `0`.
   */
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number): void;

  /**
   * Draws indexed vertices.
   * @param indexCount - The number of indices.
   * @param instanceCount - The number of instances. Defaults to `1`.
   * @param firstIndex - The first index. Defaults to `0`.
   */
  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
  ): void;

  /**
   * Ends the pass: resolves multisampled attachments into their resolve
   * targets, then discards the attachments with `storeOp: 'discard'`.
   */
  end(): void;
}

/**
 * Finished commands, submitted with `GpuDevice.submit`. On WebGL2 the
 * commands already ran as they were encoded.
 */
export interface GpuCommandBuffer {
  /** The label of the encoder that made it, or `''`. */
  readonly label: string;
}

/** Describes a command encoder for `GpuDevice.createCommandEncoder`. */
export interface GpuCommandEncoderDescriptor {
  /** A name for the encoder, used in error messages. */
  label?: string;
}

/**
 * Encodes a frame's (or a part of a frame's) render passes, one at a time.
 */
export interface GpuCommandEncoder {
  /**
   * Begins a render pass: binds its attachments, clears those with
   * `loadOp: 'clear'`, and sets the viewport and scissor to the whole
   * attachment.
   * @param descriptor - The pass's attachments.
   * @returns The encoder that records the pass's draws.
   * @throws An error if another pass from this encoder hasn't ended, or if
   * the attachments don't fit together (sizes, sample counts, formats,
   * usages).
   */
  beginRenderPass(descriptor: GpuRenderPassDescriptor): GpuRenderPassEncoder;

  /**
   * Finishes encoding.
   * @returns The command buffer to submit.
   * @throws An error if a pass hasn't ended.
   */
  finish(): GpuCommandBuffer;
}
