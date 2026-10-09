import type {
  GpuBindGroup,
  GpuBindGroupDescriptor,
  GpuBindGroupLayout,
  GpuBindGroupLayoutDescriptor,
} from './gpu-bind-group.js';
import type {
  GpuBuffer,
  GpuBufferDescriptor,
  GpuStagingBuffer,
  GpuStagingBufferDescriptor,
} from './gpu-buffer.js';
import type { GpuCapabilities } from './gpu-capabilities.js';
import type {
  GpuCommandBuffer,
  GpuCommandEncoder,
  GpuCommandEncoderDescriptor,
} from './gpu-render-pass.js';
import type {
  GpuRenderPipeline,
  GpuRenderPipelineDescriptor,
} from './gpu-render-pipeline.js';
import type {
  GpuSampler,
  GpuSamplerDescriptor,
  GpuTexture,
  GpuTextureDescriptor,
} from './gpu-texture.js';

/**
 * The GPU, as WebGPU's object model: buffers, textures, samplers, render
 * pipelines, bind groups and render passes. `renderContext.device` is the
 * render context's device, implemented on WebGL2; a WebGPU implementation
 * can follow without changing this interface.
 *
 * The device owns every GPU object it creates, and recreates them all when
 * a lost WebGL context is restored. Creating resources while the context
 * is lost records what to create, and every draw does nothing until it's
 * back.
 *
 * Errors in how resources fit together (formats, sizes, sample counts,
 * bindings, texture budgets) are thrown when a pipeline, bind group or pass
 * is created, never per draw. They include WebGPU's rules that WebGL2
 * doesn't enforce.
 */
export interface GpuDevice {
  /** What the device can do beyond WebGL2's baseline, and its limits. */
  readonly capabilities: GpuCapabilities;

  /**
   * The canvas's drawing buffer, as an `rgba8unorm` texture to use as a
   * render pass's only color attachment. It can't be sampled, resolved
   * into, or paired with a depth attachment, and its size is always the
   * drawing buffer's.
   */
  readonly canvasTexture: GpuTexture;

  /**
   * Creates a buffer.
   * @param descriptor - The buffer's usage, size and initial contents.
   * @returns The buffer.
   * @throws An error if the size isn't a positive multiple of `4`, or the
   * initial contents don't fit.
   */
  createBuffer(descriptor: GpuBufferDescriptor): GpuBuffer;

  /**
   * Creates a staging buffer: a GPU buffer written through a growing CPU
   * array and uploaded once before the passes that read it.
   * @param descriptor - The buffer's usage.
   * @returns The staging buffer.
   */
  createStagingBuffer(descriptor: GpuStagingBufferDescriptor): GpuStagingBuffer;

  /**
   * Creates a texture with immutable storage of its size, format and mip
   * level count.
   * @param descriptor - The texture's shape, format, size and usage.
   * @returns The texture.
   * @throws An error if the format isn't available on this device, or the
   * size, dimension, mip level count, sample count or usage don't fit it.
   */
  createTexture(descriptor: GpuTextureDescriptor): GpuTexture;

  /**
   * Returns the sampler for a descriptor, creating it the first time.
   * @param descriptor - The sampler's settings (default: WebGPU's).
   * @returns The sampler.
   * @throws An error if `maxAnisotropy` is above `1` with a `'nearest'`
   * filter.
   */
  createSampler(descriptor?: GpuSamplerDescriptor): GpuSampler;

  /**
   * Returns the bind group layout for a descriptor, creating it the first
   * time.
   * @param descriptor - The layout's bindings.
   * @returns The layout.
   * @throws An error if a binding is repeated, has neither or both of
   * `buffer` and `texture`, or the layout has more than four uniform
   * blocks.
   */
  createBindGroupLayout(
    descriptor: GpuBindGroupLayoutDescriptor,
  ): GpuBindGroupLayout;

  /**
   * Creates a bind group, checking each resource against its binding.
   * @param descriptor - The layout and its resources.
   * @returns The bind group.
   * @throws An error if a binding is missing or repeated, or a resource
   * doesn't fit its binding: a buffer range that isn't a uniform buffer,
   * isn't aligned or is too large; a texture of the wrong shape, sample
   * type or usage; or a sampler that filters what can't be filtered.
   */
  createBindGroup(descriptor: GpuBindGroupDescriptor): GpuBindGroup;

  /**
   * Returns the render pipeline for a descriptor, creating it (and linking
   * its program, unless an equal one is linked) the first time.
   * @param descriptor - The pipeline's shaders and state.
   * @returns The pipeline.
   * @throws An error if a shader fails to compile or link; if the shaders
   * use a uniform outside a uniform block, or a block or sampler that no
   * layout names; if a sampler's type doesn't match its binding; if the
   * textures exceed a stage's budget; or if the state doesn't fit the
   * device (alpha-to-coverage without an alpha target at location 0,
   * per-target blending without `independentBlend`, attributes outside
   * their locations).
   */
  createRenderPipeline(
    descriptor: GpuRenderPipelineDescriptor,
  ): GpuRenderPipeline;

  /**
   * Creates a command encoder, which begins render passes.
   * @param descriptor - The encoder's label.
   * @returns The encoder.
   */
  createCommandEncoder(
    descriptor?: GpuCommandEncoderDescriptor,
  ): GpuCommandEncoder;

  /**
   * Submits finished command buffers. On WebGL2 their commands already ran;
   * this checks each was finished and submitted once.
   * @param commandBuffers - The command buffers.
   * @throws An error if one was already submitted.
   */
  submit(commandBuffers: readonly GpuCommandBuffer[]): void;

  /**
   * Forgets what the device knows of the WebGL state, so its next
   * operation sets everything it needs.
   *
   * The engine's 2D renderer and code using `renderContext.gl` change WebGL
   * state without the device, so the device already assumes nothing when a
   * render pass begins or a resource is written outside one, and leaves
   * blending, depth, stencil, culling and scissor testing off, every
   * channel writable, and no vertex array or sampler bound when a pass
   * ends. Call this after changing WebGL state directly while a pass is
   * open.
   */
  resetState(): void;
}
