import type {
  GpuBindGroup,
  GpuBindGroupDescriptor,
  GpuBindGroupLayout,
  GpuBindGroupLayoutDescriptor,
} from '../gpu-bind-group.js';
import type {
  GpuBuffer,
  GpuBufferDescriptor,
  GpuStagingBuffer,
  GpuStagingBufferDescriptor,
} from '../gpu-buffer.js';
import type { GpuCapabilities } from '../gpu-capabilities.js';
import type { GpuDevice } from '../gpu-device.js';
import type {
  GpuCommandBuffer,
  GpuCommandEncoder,
  GpuCommandEncoderDescriptor,
  GpuRenderPassDescriptor,
  GpuRenderPassEncoder,
} from '../gpu-render-pass.js';
import type {
  GpuRenderPipeline,
  GpuRenderPipelineDescriptor,
} from '../gpu-render-pipeline.js';
import type {
  GpuSampler,
  GpuSamplerDescriptor,
  GpuTexture,
  GpuTextureDescriptor,
} from '../gpu-texture.js';
import type { RestorableResource } from './device-context.js';
import * as glc from './gl-constants.js';
import { GlStateCache } from './gl-state-cache.js';
import { readCapabilities } from './read-capabilities.js';
import {
  getBindGroupLayoutKey,
  WebGl2BindGroup,
  WebGl2BindGroupLayout,
} from './webgl2-bind-group.js';
import { WebGl2Buffer } from './webgl2-buffer.js';
import { WebGl2CanvasTexture } from './webgl2-canvas-texture.js';
import { WebGl2Program } from './webgl2-program.js';
import {
  AttachmentRef,
  RenderPassHost,
  VertexBufferBinding,
  WebGl2RenderPassEncoder,
} from './webgl2-render-pass-encoder.js';
import { WebGl2RenderPipeline } from './webgl2-render-pipeline.js';
import {
  getSamplerKey,
  resolveSamplerDescriptor,
  WebGl2Sampler,
} from './webgl2-sampler.js';
import { WebGl2StagingBuffer } from './webgl2-staging-buffer.js';
import { WebGl2Texture } from './webgl2-texture.js';

/** Blend factors that leave a draw buffer as WebGL starts it. */
const defaultBlendFactors = {
  srcRgb: glc.GL_ONE,
  dstRgb: glc.GL_ZERO,
  srcAlpha: glc.GL_ONE,
  dstAlpha: glc.GL_ZERO,
  modeRgb: glc.GL_FUNC_ADD,
  modeAlpha: glc.GL_FUNC_ADD,
};

/** Capabilities a pass leaves disabled when it ends. */
const capabilitiesDisabledBetweenPasses = [
  glc.GL_DEPTH_TEST,
  glc.GL_CULL_FACE,
  glc.GL_STENCIL_TEST,
  glc.GL_SCISSOR_TEST,
  glc.GL_POLYGON_OFFSET_FILL,
  glc.GL_SAMPLE_ALPHA_TO_COVERAGE,
];

/** A cached WebGL object, and the resources it was made from. */
interface CachedObject<T> {
  readonly object: T;
  readonly resourceIds: readonly number[];
}

/** A finished command buffer. */
class WebGl2CommandBuffer implements GpuCommandBuffer {
  public readonly label: string;

  constructor(label: string) {
    this.label = label;
  }
}

/** Encodes render passes, one at a time; they run as they're encoded. */
class WebGl2CommandEncoder implements GpuCommandEncoder {
  private readonly _device: WebGl2Device;
  private readonly _label: string;
  private _hasOpenPass: boolean;
  private _isFinished: boolean;

  constructor(device: WebGl2Device, label: string) {
    this._device = device;
    this._label = label;
    this._hasOpenPass = false;
    this._isFinished = false;
  }

  public beginRenderPass(
    descriptor: GpuRenderPassDescriptor,
  ): GpuRenderPassEncoder {
    if (this._isFinished || this._hasOpenPass) {
      throw new Error(
        `Command encoder "${this._label}" can't begin a pass: it's finished, or its last pass hasn't ended.`,
      );
    }

    const pass = this._device.beginRenderPass(descriptor, () => {
      this._hasOpenPass = false;
    });

    this._hasOpenPass = true;

    return pass;
  }

  public finish(): GpuCommandBuffer {
    if (this._isFinished || this._hasOpenPass) {
      throw new Error(
        `Command encoder "${this._label}" can't finish: it's finished, or its last pass hasn't ended.`,
      );
    }

    this._isFinished = true;

    return this._device.registerCommandBuffer(
      new WebGl2CommandBuffer(this._label),
    );
  }
}

/**
 * The GPU device on WebGL2. It owns every WebGL object it creates and
 * recreates them all when a lost context is restored, and sets all state
 * through a cache so only changes reach WebGL.
 */
export class WebGl2Device implements GpuDevice, RenderPassHost {
  public readonly gl: WebGL2RenderingContext;
  public readonly state: GlStateCache;
  public readonly canvasTexture: WebGl2CanvasTexture;

  private readonly _isLost: () => boolean;
  private readonly _buffers = new Set<WebGl2Buffer>();
  private readonly _stagingBuffers = new Set<WebGl2StagingBuffer>();
  private readonly _dirtyStagingBuffers = new Set<WebGl2StagingBuffer>();
  private readonly _textures = new Set<WebGl2Texture>();
  private readonly _samplers = new Map<string, WebGl2Sampler>();
  private readonly _layouts = new Map<string, WebGl2BindGroupLayout>();
  private readonly _programs = new Map<string, WebGl2Program>();
  private readonly _pipelines = new Map<string, WebGl2RenderPipeline>();
  private readonly _framebuffers = new Map<
    string,
    CachedObject<WebGLFramebuffer>
  >();
  private readonly _vertexArrays = new Map<
    string,
    CachedObject<WebGLVertexArrayObject>
  >();
  private readonly _vertexLayoutIds = new Map<string, number>();
  private readonly _finishedCommandBuffers = new WeakSet<GpuCommandBuffer>();
  private readonly _submittedCommandBuffers = new WeakSet<GpuCommandBuffer>();
  private _capabilities: GpuCapabilities;
  private _passEndCallback: (() => void) | null;
  private _openPass: WebGl2RenderPassEncoder | null;
  private _isOpeningPass: boolean;
  private _nextId: number;

  /**
   * Creates the device over a WebGL2 context, requesting the extensions it
   * uses and reading its limits.
   * @param gl - The WebGL2 context.
   * @param isLost - Whether the context counts as lost (the render
   * context's `isContextLost`).
   */
  constructor(gl: WebGL2RenderingContext, isLost: () => boolean) {
    const { capabilities, extensions } = readCapabilities(gl);

    this.gl = gl;
    this._isLost = isLost;
    this._capabilities = capabilities;
    this.state = new GlStateCache(
      gl,
      capabilities.limits.maxColorAttachments,
      extensions.drawBuffersIndexed,
    );
    this._passEndCallback = null;
    this._openPass = null;
    this._isOpeningPass = false;
    this._nextId = 1;
    this.canvasTexture = new WebGl2CanvasTexture(gl, this.nextId());
  }

  get capabilities(): GpuCapabilities {
    return this._capabilities;
  }

  get isContextLost(): boolean {
    return this._isLost();
  }

  public createBuffer(descriptor: GpuBufferDescriptor): GpuBuffer {
    const contents = new Uint8Array(descriptor.size);

    if (descriptor.data) {
      if (descriptor.data.byteLength > descriptor.size) {
        throw new Error(
          `Buffer "${descriptor.label ?? ''}"'s ${descriptor.data.byteLength} bytes of data don't fit its ${descriptor.size} bytes.`,
        );
      }

      contents.set(
        new Uint8Array(
          descriptor.data.buffer,
          descriptor.data.byteOffset,
          descriptor.data.byteLength,
        ),
      );
    }

    const buffer = new WebGl2Buffer(
      this,
      {
        usage: descriptor.usage,
        size: descriptor.size,
        label: descriptor.label ?? '',
      },
      contents,
      (destroyed) => {
        this._buffers.delete(destroyed);
      },
    );

    this._buffers.add(buffer);

    return buffer;
  }

  public createStagingBuffer(
    descriptor: GpuStagingBufferDescriptor,
  ): GpuStagingBuffer {
    const staging = new WebGl2StagingBuffer(
      this,
      descriptor.usage,
      descriptor.label ?? '',
      (dirty) => {
        this._dirtyStagingBuffers.add(dirty);
      },
      (destroyed) => {
        this._stagingBuffers.delete(destroyed);
        this._dirtyStagingBuffers.delete(destroyed);
      },
    );

    this._stagingBuffers.add(staging);

    return staging;
  }

  public createTexture(descriptor: GpuTextureDescriptor): GpuTexture {
    const texture = new WebGl2Texture(this, descriptor, (destroyed) => {
      this._textures.delete(destroyed);
    });

    this._textures.add(texture);

    return texture;
  }

  public createSampler(descriptor: GpuSamplerDescriptor = {}): GpuSampler {
    const resolved = resolveSamplerDescriptor(descriptor);
    const key = getSamplerKey(resolved);
    let sampler = this._samplers.get(key);

    if (!sampler) {
      sampler = new WebGl2Sampler(this, resolved);
      this._samplers.set(key, sampler);
    }

    return sampler;
  }

  public createBindGroupLayout(
    descriptor: GpuBindGroupLayoutDescriptor,
  ): GpuBindGroupLayout {
    const key = getBindGroupLayoutKey(descriptor);
    let layout = this._layouts.get(key);

    if (!layout) {
      layout = new WebGl2BindGroupLayout(descriptor, this.nextId());
      this._layouts.set(key, layout);
    }

    return layout;
  }

  public createBindGroup(descriptor: GpuBindGroupDescriptor): GpuBindGroup {
    return new WebGl2BindGroup(this, descriptor);
  }

  public createRenderPipeline(
    descriptor: GpuRenderPipelineDescriptor,
  ): GpuRenderPipeline {
    const key = JSON.stringify(descriptor, (_, value: unknown) =>
      value instanceof WebGl2BindGroupLayout ? `layout#${value.id}` : value,
    );
    let pipeline = this._pipelines.get(key);

    if (!pipeline) {
      pipeline = new WebGl2RenderPipeline(
        this,
        descriptor,
        this.nextId(),
        (created) => this._getProgram(created, descriptor),
      );
      this._pipelines.set(key, pipeline);
    }

    return pipeline;
  }

  public createCommandEncoder(
    descriptor: GpuCommandEncoderDescriptor = {},
  ): GpuCommandEncoder {
    return new WebGl2CommandEncoder(this, descriptor.label ?? '');
  }

  public submit(commandBuffers: readonly GpuCommandBuffer[]): void {
    for (const commandBuffer of commandBuffers) {
      if (
        !this._finishedCommandBuffers.has(commandBuffer) ||
        this._submittedCommandBuffers.has(commandBuffer)
      ) {
        throw new Error(
          `Command buffer "${commandBuffer.label}" wasn't finished by this device, or was already submitted.`,
        );
      }

      this._submittedCommandBuffers.add(commandBuffer);
    }
  }

  public resetState(): void {
    this.state.reset();
    this._openPass?.invalidate();
  }

  /**
   * Begins a render pass for a command encoder.
   * @param descriptor - The pass's attachments.
   * @param onEnd - Called when the pass ends.
   * @returns The pass encoder.
   */
  public beginRenderPass(
    descriptor: GpuRenderPassDescriptor,
    onEnd: () => void,
  ): GpuRenderPassEncoder {
    if (this._openPass || this._isOpeningPass) {
      throw new Error('Another render pass is still open; end it first.');
    }

    this._isOpeningPass = true;

    try {
      const pass = new WebGl2RenderPassEncoder(this, descriptor);

      this._openPass = pass;
      this._passEndCallback = onEnd;

      return pass;
    } finally {
      this._isOpeningPass = false;
    }
  }

  /**
   * Records a finished command buffer, so `submit` accepts it once.
   * @param commandBuffer - The command buffer.
   * @returns The same command buffer.
   */
  public registerCommandBuffer(
    commandBuffer: GpuCommandBuffer,
  ): GpuCommandBuffer {
    this._finishedCommandBuffers.add(commandBuffer);

    return commandBuffer;
  }

  public endPass(): void {
    this._openPass = null;
    this._passEndCallback?.();
    this._passEndCallback = null;
  }

  public beginOperation(): void {
    // Inside a pass the cache stays valid, but creating a resource or
    // linking a program rebinds what the pass's next draw uses, so the pass
    // applies its state again (only what changed reaches WebGL).
    if (this._openPass) {
      this._openPass.invalidate();

      return;
    }

    this.state.reset();
  }

  public assertNoOpenPass(operation: string): void {
    if (this._openPass) {
      throw new Error(
        `${operation} can't happen while a render pass is open. Write resources before beginning the pass.`,
      );
    }
  }

  public nextId(): number {
    return this._nextId++;
  }

  public flushStaging(): void {
    for (const staging of this._dirtyStagingBuffers) {
      staging.flush();

      if (!staging.isDirty) {
        this._dirtyStagingBuffers.delete(staging);
      }
    }
  }

  public restoreSharedDefaults(): void {
    const { state } = this;

    state.setBlend(false, defaultBlendFactors);

    for (const capability of capabilitiesDisabledBetweenPasses) {
      state.setEnabled(capability, false);
    }

    state.colorMask(0xf);
    state.depthMask(true);

    for (const unit of state.unitsWithSamplers()) {
      state.bindSampler(unit, null);
    }

    state.bindVertexArray(null);
  }

  public getFramebuffer(
    colors: readonly AttachmentRef[],
    depth: AttachmentRef | null,
  ): WebGLFramebuffer | null {
    if (colors[0]?.texture.isCanvas) {
      return null;
    }

    const refs = depth ? [...colors, depth] : colors;
    const key = `${colors.map(refKey).join(',')}|${depth ? refKey(depth) : ''}`;
    const cached = this._framebuffers.get(key);

    if (cached) {
      return cached.object;
    }

    const framebuffer = this._createFramebuffer(colors, depth);

    this._framebuffers.set(key, {
      object: framebuffer,
      resourceIds: refs.map((ref) => ref.texture.id),
    });

    return framebuffer;
  }

  public getVertexArray(
    pipeline: WebGl2RenderPipeline,
    vertexBuffers: readonly (VertexBufferBinding | undefined)[],
    indexBuffer: WebGl2Buffer | null,
  ): WebGLVertexArrayObject | null {
    const slots = pipeline.vertexBuffers;

    if (slots.length === 0 && indexBuffer === null) {
      return null;
    }

    let layoutId = this._vertexLayoutIds.get(pipeline.vertexLayoutKey);

    if (layoutId === undefined) {
      layoutId = this._vertexLayoutIds.size;
      this._vertexLayoutIds.set(pipeline.vertexLayoutKey, layoutId);
    }

    const bindings = slots.map((_, slot) => {
      const binding = vertexBuffers[slot];

      if (!binding) {
        throw new Error(
          `Pipeline "${pipeline.label}" reads vertex buffer slot ${slot}, which has no buffer set.`,
        );
      }

      return binding;
    });
    const key = `${layoutId}|${bindings
      .map((binding) => `${binding.buffer.id}@${binding.offset}`)
      .join(',')}|${indexBuffer?.id ?? ''}`;
    const cached = this._vertexArrays.get(key);

    if (cached) {
      return cached.object;
    }

    const vertexArray = this._createVertexArray(
      pipeline,
      bindings,
      indexBuffer,
    );
    const resourceIds = bindings.map((binding) => binding.buffer.id);

    if (indexBuffer) {
      resourceIds.push(indexBuffer.id);
    }

    this._vertexArrays.set(key, { object: vertexArray, resourceIds });

    return vertexArray;
  }

  public releaseCachedObjectsOf(id: number): void {
    const { gl, state } = this;
    const isLost = this.isContextLost;

    for (const [key, cached] of this._framebuffers) {
      if (cached.resourceIds.includes(id)) {
        state.forget(cached.object);

        if (!isLost) {
          gl.deleteFramebuffer(cached.object);
        }

        this._framebuffers.delete(key);
      }
    }

    for (const [key, cached] of this._vertexArrays) {
      if (cached.resourceIds.includes(id)) {
        state.forget(cached.object);

        if (!isLost) {
          gl.deleteVertexArray(cached.object);
        }

        this._vertexArrays.delete(key);
      }
    }
  }

  /**
   * Recreates every GPU object after a lost WebGL context is restored:
   * requests the extensions again and rereads the limits, then recreates
   * samplers, textures, buffers and programs. Framebuffers and vertex
   * arrays are recreated as passes and draws need them. One resource
   * failing doesn't stop the rest.
   * @returns The errors of resources that couldn't be recreated.
   */
  public restore(): unknown[] {
    const { capabilities, extensions } = readCapabilities(this.gl);

    this._capabilities = capabilities;
    this.state.configure(
      capabilities.limits.maxColorAttachments,
      extensions.drawBuffersIndexed,
    );
    this._framebuffers.clear();
    this._vertexArrays.clear();

    const resources: RestorableResource[] = [
      ...this._samplers.values(),
      ...this._textures,
      ...this._buffers,
      ...this._stagingBuffers,
      ...this._programs.values(),
    ];
    const errors: unknown[] = [];

    for (const resource of resources) {
      try {
        resource.restore();
      } catch (error) {
        errors.push(error);
      }
    }

    for (const staging of this._stagingBuffers) {
      if (staging.isDirty) {
        this._dirtyStagingBuffers.add(staging);
      }
    }

    this.state.reset();

    return errors;
  }

  private _getProgram(
    pipeline: WebGl2RenderPipeline,
    descriptor: GpuRenderPipelineDescriptor,
  ): WebGl2Program {
    let program = this._programs.get(pipeline.programKey);

    if (!program) {
      program = new WebGl2Program(
        this,
        descriptor.shaders,
        pipeline.attributeBindings,
        pipeline.bindGroupLayouts,
        pipeline.label,
      );
      this._programs.set(pipeline.programKey, program);
    }

    return program;
  }

  private _createFramebuffer(
    colors: readonly AttachmentRef[],
    depth: AttachmentRef | null,
  ): WebGLFramebuffer {
    const { gl, state } = this;
    const framebuffer = gl.createFramebuffer();

    state.bindDrawFramebuffer(framebuffer);

    colors.forEach((ref, index) => {
      attach(gl, glc.GL_COLOR_ATTACHMENT0 + index, ref);
    });

    if (depth) {
      const point = depth.texture.formatInfo.hasStencil
        ? glc.GL_DEPTH_STENCIL_ATTACHMENT
        : glc.GL_DEPTH_ATTACHMENT;

      attach(gl, point, depth);
    }

    gl.drawBuffers(
      colors.length > 0
        ? colors.map((_, index) => glc.GL_COLOR_ATTACHMENT0 + index)
        : [glc.GL_NONE],
    );

    const status = gl.checkFramebufferStatus(glc.GL_DRAW_FRAMEBUFFER);

    if (status !== glc.GL_FRAMEBUFFER_COMPLETE && !this.isContextLost) {
      state.forget(framebuffer);
      gl.deleteFramebuffer(framebuffer);

      throw new Error(
        `A render pass's attachments don't make a complete framebuffer (status 0x${status.toString(16)}).`,
      );
    }

    return framebuffer;
  }

  private _createVertexArray(
    pipeline: WebGl2RenderPipeline,
    bindings: readonly VertexBufferBinding[],
    indexBuffer: WebGl2Buffer | null,
  ): WebGLVertexArrayObject {
    const { gl, state } = this;
    const vertexArray = gl.createVertexArray();

    state.bindVertexArray(vertexArray);

    pipeline.vertexBuffers.forEach((layout, slot) => {
      const binding = bindings[slot];

      state.bindBuffer(glc.GL_ARRAY_BUFFER, binding.buffer.glBuffer);

      for (const attribute of layout.attributes) {
        const offset = binding.offset + attribute.offset;

        gl.enableVertexAttribArray(attribute.location);

        if (attribute.integer) {
          gl.vertexAttribIPointer(
            attribute.location,
            attribute.components,
            attribute.type,
            layout.stride,
            offset,
          );
        } else {
          gl.vertexAttribPointer(
            attribute.location,
            attribute.components,
            attribute.type,
            attribute.normalized,
            layout.stride,
            offset,
          );
        }

        gl.vertexAttribDivisor(
          attribute.location,
          layout.stepMode === 'instance' ? 1 : 0,
        );
      }
    });

    if (indexBuffer) {
      gl.bindBuffer(glc.GL_ELEMENT_ARRAY_BUFFER, indexBuffer.glBuffer);
    }

    return vertexArray;
  }
}

function refKey(ref: AttachmentRef): string {
  return `${ref.texture.id}:${ref.mipLevel}:${ref.arrayLayer}`;
}

/** Attaches a texture's mip level and layer (or renderbuffer) to a point. */
function attach(
  gl: WebGL2RenderingContext,
  point: number,
  ref: AttachmentRef,
): void {
  const texture = ref.texture;

  if (!(texture instanceof WebGl2Texture)) {
    throw new Error(
      'The canvas can only be the only color attachment of a pass.',
    );
  }

  if (texture.sampleCount > 1) {
    gl.framebufferRenderbuffer(
      glc.GL_DRAW_FRAMEBUFFER,
      point,
      glc.GL_RENDERBUFFER,
      texture.glRenderbuffer,
    );

    return;
  }

  if (texture.dimension === '2d') {
    gl.framebufferTexture2D(
      glc.GL_DRAW_FRAMEBUFFER,
      point,
      glc.GL_TEXTURE_2D,
      texture.glTexture,
      ref.mipLevel,
    );

    return;
  }

  if (texture.dimension === 'cube') {
    gl.framebufferTexture2D(
      glc.GL_DRAW_FRAMEBUFFER,
      point,
      glc.GL_TEXTURE_CUBE_MAP_POSITIVE_X + ref.arrayLayer,
      texture.glTexture,
      ref.mipLevel,
    );

    return;
  }

  gl.framebufferTextureLayer(
    glc.GL_DRAW_FRAMEBUFFER,
    point,
    texture.glTexture,
    ref.mipLevel,
    ref.arrayLayer,
  );
}
