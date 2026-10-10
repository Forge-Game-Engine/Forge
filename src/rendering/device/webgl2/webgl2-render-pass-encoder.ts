import type { GpuBindGroup } from '../gpu-bind-group.js';
import type { GpuBuffer } from '../gpu-buffer.js';
import type {
  GpuAttachmentView,
  GpuIndexFormat,
  GpuLoadOp,
  GpuRenderPassDescriptor,
  GpuRenderPassEncoder,
  GpuStoreOp,
} from '../gpu-render-pass.js';
import { colorWrite } from '../gpu-render-pipeline.js';
import type { GpuRenderPipeline } from '../gpu-render-pipeline.js';
import type { DeviceContext } from './device-context.js';
import * as glc from './gl-constants.js';
import { isFormatRenderable, TextureFormatInfo } from './texture-formats.js';
import {
  maxUniformBlocksPerGroup,
  WebGl2BindGroup,
} from './webgl2-bind-group.js';
import { WebGl2Buffer } from './webgl2-buffer.js';
import { WebGl2CanvasTexture } from './webgl2-canvas-texture.js';
import {
  getAttachmentSignature,
  maxBindGroups,
  WebGl2RenderPipeline,
} from './webgl2-render-pipeline.js';
import { WebGl2Texture } from './webgl2-texture.js';

/** A texture (or the canvas), one of its mip levels and one of its layers. */
export interface AttachmentRef {
  readonly texture: WebGl2Texture | WebGl2CanvasTexture;
  readonly mipLevel: number;
  readonly arrayLayer: number;
}

/** A vertex buffer set on a slot. */
export interface VertexBufferBinding {
  readonly buffer: WebGl2Buffer;
  readonly offset: number;
}

/** What a render pass needs from its device. */
export interface RenderPassHost extends DeviceContext {
  /** Uploads every staging buffer's changes. */
  flushStaging(): void;

  /**
   * Returns the framebuffer for a set of attachments, creating it the first
   * time; `null` for the canvas.
   */
  getFramebuffer(
    colors: readonly AttachmentRef[],
    depth: AttachmentRef | null,
  ): WebGLFramebuffer | null;

  /** Returns the vertex array for a pipeline's layout and buffers. */
  getVertexArray(
    pipeline: WebGl2RenderPipeline,
    vertexBuffers: readonly (VertexBufferBinding | undefined)[],
    indexBuffer: WebGl2Buffer | null,
  ): WebGLVertexArrayObject | null;

  /** Leaves WebGL state as other drawing code expects it. */
  restoreSharedDefaults(): void;

  /** Called when the pass ends. */
  endPass(): void;
}

interface ColorAttachment {
  readonly ref: AttachmentRef;
  readonly resolve: AttachmentRef | null;
  readonly loadOp: GpuLoadOp;
  readonly clearValue: readonly number[];
  readonly storeOp: GpuStoreOp;
}

interface DepthAttachment {
  readonly ref: AttachmentRef;
  readonly depthLoadOp: GpuLoadOp;
  readonly depthClearValue: number;
  readonly depthStoreOp: GpuStoreOp;
  readonly stencilLoadOp: GpuLoadOp;
  readonly stencilClearValue: number;
  readonly stencilStoreOp: GpuStoreOp;
}

const indexFormats: Record<GpuIndexFormat, { type: number; size: number }> = {
  uint16: { type: glc.GL_UNSIGNED_SHORT, size: 2 },
  uint32: { type: glc.GL_UNSIGNED_INT, size: 4 },
};

const GL_STENCIL_ATTACHMENT = 0x8d20;

function toRef(view: GpuAttachmentView): AttachmentRef {
  const isView = 'texture' in view && !('dimension' in view);
  const texture = isView ? view.texture : view;

  if (
    !(texture instanceof WebGl2Texture) &&
    !(texture instanceof WebGl2CanvasTexture)
  ) {
    throw new Error(
      'A render pass attachment must be a texture made by the same device.',
    );
  }

  return {
    texture,
    mipLevel: isView ? view.mipLevel : 0,
    arrayLayer: isView ? view.arrayLayer : 0,
  };
}

function sizeOf(ref: AttachmentRef): { width: number; height: number } {
  return {
    width: Math.max(1, ref.texture.width >> ref.mipLevel),
    height: Math.max(1, ref.texture.height >> ref.mipLevel),
  };
}

/**
 * A render pass on WebGL2: binds its framebuffer and clears when it begins,
 * applies pipeline and binding state when a draw needs it (through the
 * state cache, so only changes reach WebGL), and resolves and invalidates
 * when it ends.
 */
export class WebGl2RenderPassEncoder implements GpuRenderPassEncoder {
  private readonly _host: RenderPassHost;
  private readonly _label: string;
  private readonly _colors: readonly ColorAttachment[];
  private readonly _depth: DepthAttachment | null;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _signature: string;
  private readonly _isActive: boolean;
  private readonly _bindGroups: (WebGl2BindGroup | null)[];
  private readonly _dynamicOffsets: (readonly number[])[];
  private readonly _vertexBuffers: (VertexBufferBinding | undefined)[];
  private _framebuffer: WebGLFramebuffer | null;
  private _pipeline: WebGl2RenderPipeline | null;
  private _indexBuffer: WebGl2Buffer | null;
  private _indexType: number;
  private _indexSize: number;
  private _indexOffset: number;
  private _vertexArray: WebGLVertexArrayObject | null;
  private _viewport: readonly number[];
  private _depthRange: readonly number[];
  private _scissor: readonly number[] | null;
  private _blendConstant: readonly number[];
  private _stencilReference: number;
  private _isPipelineDirty: boolean;
  private _isVertexDirty: boolean;
  private readonly _dirtyBindGroups: boolean[];
  private _hasEnded: boolean;

  /**
   * Checks the attachments, then begins the pass: binds the framebuffer,
   * clears, and sets the viewport. While the context is lost, the pass is
   * checked but does nothing.
   * @param host - The device.
   * @param descriptor - The pass's attachments.
   * @throws An error if the attachments don't fit together.
   */
  constructor(host: RenderPassHost, descriptor: GpuRenderPassDescriptor) {
    this._host = host;
    this._label = descriptor.label ?? '';
    this._colors = descriptor.colorAttachments.map((attachment) => ({
      ref: toRef(attachment.view),
      resolve: attachment.resolveTarget
        ? toRef(attachment.resolveTarget)
        : null,
      loadOp: attachment.loadOp,
      clearValue: attachment.clearValue ?? [0, 0, 0, 0],
      storeOp: attachment.storeOp,
    }));

    const depth = descriptor.depthStencilAttachment;

    this._depth = depth
      ? {
          ref: toRef(depth.view),
          depthLoadOp: depth.depthLoadOp ?? 'load',
          depthClearValue: depth.depthClearValue ?? 1,
          depthStoreOp: depth.depthStoreOp ?? 'store',
          stencilLoadOp: depth.stencilLoadOp ?? 'load',
          stencilClearValue: depth.stencilClearValue ?? 0,
          stencilStoreOp: depth.stencilStoreOp ?? 'store',
        }
      : null;

    const first = this._colors[0]?.ref ?? this._depth?.ref;

    if (!first) {
      throw new Error(
        `Render pass "${this._label}" needs at least one attachment.`,
      );
    }

    const size = sizeOf(first);

    this._width = size.width;
    this._height = size.height;
    this._signature = this._validate();
    this._isActive = !host.isContextLost;
    this._bindGroups = new Array<WebGl2BindGroup | null>(maxBindGroups).fill(
      null,
    );
    this._dynamicOffsets = new Array<readonly number[]>(maxBindGroups).fill([]);
    this._dirtyBindGroups = new Array<boolean>(maxBindGroups).fill(true);
    this._vertexBuffers = [];
    this._framebuffer = null;
    this._pipeline = null;
    this._indexBuffer = null;
    this._indexType = glc.GL_UNSIGNED_SHORT;
    this._indexSize = 2;
    this._indexOffset = 0;
    this._vertexArray = null;
    this._viewport = [0, 0, this._width, this._height];
    this._depthRange = [0, 1];
    this._scissor = null;
    this._blendConstant = [0, 0, 0, 0];
    this._stencilReference = 0;
    this._isPipelineDirty = true;
    this._isVertexDirty = true;
    this._hasEnded = false;

    if (!this._isActive) {
      return;
    }

    this._begin();
  }

  public setPipeline(pipeline: GpuRenderPipeline): void {
    this._assertOpen();

    if (!(pipeline instanceof WebGl2RenderPipeline)) {
      throw new Error('A render pipeline must be made by the same device.');
    }

    if (pipeline === this._pipeline) {
      return;
    }

    if (pipeline.attachmentSignature !== this._signature) {
      throw new Error(
        `Pipeline "${pipeline.label}" renders to ${pipeline.attachmentSignature}, but render pass "${this._label}" has ${this._signature} (color formats | depth format | samples).`,
      );
    }

    this._pipeline = pipeline;
    this.invalidate();
  }

  public setBindGroup(
    index: number,
    bindGroup: GpuBindGroup,
    dynamicOffsets: readonly number[] = [],
  ): void {
    this._assertOpen();

    if (!Number.isInteger(index) || index < 0 || index >= maxBindGroups) {
      throw new Error(
        `Bind group slot ${index} doesn't exist; slots are 0 to ${maxBindGroups - 1}.`,
      );
    }

    if (!(bindGroup instanceof WebGl2BindGroup)) {
      throw new Error('A bind group must be made by the same device.');
    }

    this._assertDynamicOffsets(bindGroup, dynamicOffsets);

    if (
      this._bindGroups[index] === bindGroup &&
      sameOffsets(this._dynamicOffsets[index], dynamicOffsets)
    ) {
      return;
    }

    this._bindGroups[index] = bindGroup;
    this._dynamicOffsets[index] = [...dynamicOffsets];
    this._dirtyBindGroups[index] = true;
  }

  public setVertexBuffer(
    slot: number,
    buffer: GpuBuffer,
    offset: number = 0,
  ): void {
    this._assertOpen();

    if (!(buffer instanceof WebGl2Buffer) || buffer.usage !== 'vertex') {
      throw new Error(
        `Vertex buffer slot ${slot} needs a 'vertex' buffer made by the same device.`,
      );
    }

    const current = this._vertexBuffers[slot];

    if (current?.buffer === buffer && current.offset === offset) {
      return;
    }

    this._vertexBuffers[slot] = { buffer, offset };
    this._isVertexDirty = true;
  }

  public setIndexBuffer(
    buffer: GpuBuffer,
    format: GpuIndexFormat,
    offset: number = 0,
  ): void {
    this._assertOpen();

    const { type, size } = indexFormats[format];

    if (
      !(buffer instanceof WebGl2Buffer) ||
      buffer.usage !== 'index' ||
      offset % size !== 0
    ) {
      throw new Error(
        `The index buffer must be an 'index' buffer made by the same device, at an offset that's a multiple of ${size}.`,
      );
    }

    if (this._indexBuffer !== buffer) {
      this._isVertexDirty = true;
    }

    this._indexBuffer = buffer;
    this._indexType = type;
    this._indexSize = size;
    this._indexOffset = offset;
  }

  public setViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    minDepth: number,
    maxDepth: number,
  ): void {
    this._assertOpen();
    this._viewport = [x, y, width, height];
    this._depthRange = [minDepth, maxDepth];
  }

  public setScissorRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this._assertOpen();
    this._scissor = [x, y, width, height];
  }

  public setBlendConstant(
    color: readonly [number, number, number, number],
  ): void {
    this._assertOpen();
    this._blendConstant = [...color];
    this._isPipelineDirty = true;
  }

  public setStencilReference(reference: number): void {
    this._assertOpen();
    this._stencilReference = reference;
    this._isPipelineDirty = true;
  }

  public draw(
    vertexCount: number,
    instanceCount: number = 1,
    firstVertex: number = 0,
  ): void {
    this._assertOpen();

    // A context lost during the pass ignores calls, so draws need no check
    // of their own.
    if (!this._isActive) {
      return;
    }

    const pipeline = this._prepare();

    this._host.gl.drawArraysInstanced(
      pipeline.topology,
      firstVertex,
      vertexCount,
      instanceCount,
    );
  }

  public drawIndexed(
    indexCount: number,
    instanceCount: number = 1,
    firstIndex: number = 0,
  ): void {
    this._assertOpen();

    // A context lost during the pass ignores calls, so draws need no check
    // of their own.
    if (!this._isActive) {
      return;
    }

    if (!this._indexBuffer) {
      throw new Error(
        `Render pass "${this._label}" draws indexed without an index buffer.`,
      );
    }

    const pipeline = this._prepare();

    this._host.gl.drawElementsInstanced(
      pipeline.topology,
      indexCount,
      this._indexType,
      this._indexOffset + firstIndex * this._indexSize,
      instanceCount,
    );
  }

  public end(): void {
    this._assertOpen();
    this._hasEnded = true;

    if (this._isActive && !this._host.isContextLost) {
      this._resolve();
      this._invalidate();
      this._host.restoreSharedDefaults();
    }

    this._host.endPass();
  }

  /**
   * Forgets what was applied, so the next draw applies its pipeline,
   * bindings and vertex array again. Called when the device's state cache
   * is reset while the pass is open.
   */
  public invalidate(): void {
    this._isPipelineDirty = true;
    this._isVertexDirty = true;
    this._dirtyBindGroups.fill(true);
  }

  private _validate(): string {
    const { capabilities } = this._host;
    const colors = this._colors;
    const refs = [
      ...colors.map((color) => color.ref),
      ...(this._depth ? [this._depth.ref] : []),
    ];
    const sampleCount = refs[0].texture.sampleCount;

    if (colors.length > capabilities.limits.maxColorAttachments) {
      throw new Error(
        `Render pass "${this._label}" has ${colors.length} color attachments; this device allows ${capabilities.limits.maxColorAttachments}.`,
      );
    }

    for (const ref of refs) {
      const size = sizeOf(ref);

      if (
        !ref.texture.usage.includes('render-attachment') ||
        size.width !== this._width ||
        size.height !== this._height ||
        ref.texture.sampleCount !== sampleCount
      ) {
        throw new Error(
          `Render pass "${this._label}"'s attachments must all be render attachments of the same size and sample count; texture "${ref.texture.label}" isn't.`,
        );
      }
    }

    colors.forEach((color) => {
      this._validateColor(color, colors.length);
    });

    if (
      this._depth &&
      (!this._depth.ref.texture.formatInfo.hasDepth ||
        this._depth.ref.texture.isCanvas)
    ) {
      throw new Error(
        `Render pass "${this._label}"'s depth attachment must have a depth format.`,
      );
    }

    if (this._depth && colors.some((color) => color.ref.texture.isCanvas)) {
      throw new Error(
        `Render pass "${this._label}" can't pair the canvas with a depth attachment.`,
      );
    }

    return getAttachmentSignature(
      colors.map((color) => color.ref.texture.format),
      this._depth?.ref.texture.format ?? null,
      sampleCount,
    );
  }

  private _validateColor(color: ColorAttachment, colorCount: number): void {
    const { texture } = color.ref;
    const info: TextureFormatInfo = texture.formatInfo;

    if (info.hasDepth || !isFormatRenderable(info, this._host.capabilities)) {
      throw new Error(
        `Render pass "${this._label}" can't render color into "${texture.format}" texture "${texture.label}".`,
      );
    }

    if (texture.isCanvas && colorCount !== 1) {
      throw new Error(
        `Render pass "${this._label}" must have the canvas as its only color attachment.`,
      );
    }

    if (!color.resolve) {
      return;
    }

    const target = color.resolve.texture;
    const size = sizeOf(color.resolve);

    if (
      texture.sampleCount === 1 ||
      target.isCanvas ||
      target.sampleCount !== 1 ||
      target.format !== texture.format ||
      !target.usage.includes('render-attachment') ||
      size.width !== this._width ||
      size.height !== this._height
    ) {
      throw new Error(
        `Render pass "${this._label}" resolves "${texture.label}" into "${target.label}": the source must be multisampled and the target a single-sampled render attachment of the same format and size.`,
      );
    }
  }

  private _begin(): void {
    const host = this._host;
    const { state } = host;

    host.beginOperation();
    host.flushStaging();
    this._framebuffer = host.getFramebuffer(
      this._colors.map((color) => color.ref),
      this._depth?.ref ?? null,
    );
    state.bindFramebuffer(this._framebuffer);
    state.viewport(0, 0, this._width, this._height);
    state.depthRange(0, 1);
    state.setEnabled(glc.GL_SCISSOR_TEST, false);
    this._clear();
  }

  private _clear(): void {
    const { gl, state } = this._host;

    state.colorMask(colorWrite.all);

    this._colors.forEach((color, index) => {
      if (color.loadOp !== 'clear') {
        return;
      }

      if (color.ref.texture.formatInfo.sampleClass === 'uint') {
        gl.clearBufferuiv(glc.GL_COLOR, index, color.clearValue);

        return;
      }

      gl.clearBufferfv(glc.GL_COLOR, index, color.clearValue);
    });

    const depth = this._depth;

    if (!depth) {
      return;
    }

    const hasStencil = depth.ref.texture.formatInfo.hasStencil;
    const clearsDepth = depth.depthLoadOp === 'clear';
    const clearsStencil = hasStencil && depth.stencilLoadOp === 'clear';

    state.depthMask(true);
    state.stencilMask(0xff);

    if (clearsDepth && clearsStencil) {
      gl.clearBufferfi(
        glc.GL_DEPTH_STENCIL,
        0,
        depth.depthClearValue,
        depth.stencilClearValue,
      );

      return;
    }

    if (clearsDepth) {
      gl.clearBufferfv(glc.GL_DEPTH, 0, [depth.depthClearValue]);
    }

    if (clearsStencil) {
      gl.clearBufferiv(glc.GL_STENCIL, 0, [depth.stencilClearValue]);
    }
  }

  /** Applies whatever changed since the last draw, and returns the pipeline. */
  private _prepare(): WebGl2RenderPipeline {
    const host = this._host;
    const pipeline = this._pipeline;

    if (!pipeline) {
      throw new Error(`Render pass "${this._label}" draws without a pipeline.`);
    }

    host.state.bindFramebuffer(this._framebuffer);
    this._applyViewportAndScissor();

    if (this._isPipelineDirty) {
      this._applyPipeline(pipeline);
      this._isPipelineDirty = false;
    }

    for (let slot = 0; slot < pipeline.bindGroupLayouts.length; slot++) {
      if (this._dirtyBindGroups[slot]) {
        this._applyBindGroup(pipeline, slot);
        this._dirtyBindGroups[slot] = false;
      }
    }

    if (this._isVertexDirty) {
      this._vertexArray = host.getVertexArray(
        pipeline,
        this._vertexBuffers,
        this._indexBuffer,
      );
      this._isVertexDirty = false;
    }

    host.state.bindVertexArray(this._vertexArray);

    return pipeline;
  }

  private _applyViewportAndScissor(): void {
    const { state } = this._host;
    const [x, y, width, height] = this._viewport;

    state.viewport(x, y, width, height);
    state.depthRange(this._depthRange[0], this._depthRange[1]);

    if (!this._scissor) {
      state.setEnabled(glc.GL_SCISSOR_TEST, false);

      return;
    }

    state.setEnabled(glc.GL_SCISSOR_TEST, true);
    state.scissor(
      this._scissor[0],
      this._scissor[1],
      this._scissor[2],
      this._scissor[3],
    );
  }

  private _applyPipeline(pipeline: WebGl2RenderPipeline): void {
    const { state } = this._host;
    const program = pipeline.program.glProgram;

    if (!program) {
      throw new Error(`Pipeline "${pipeline.label}" isn't linked.`);
    }

    state.useProgram(program);
    state.setEnabled(glc.GL_CULL_FACE, pipeline.cullFace !== null);

    if (pipeline.cullFace !== null) {
      state.cullFace(pipeline.cullFace);
    }

    state.frontFace(pipeline.frontFace);
    this._applyDepthStencil(pipeline);
    this._applyBlend(pipeline);
    state.setEnabled(glc.GL_SAMPLE_ALPHA_TO_COVERAGE, pipeline.alphaToCoverage);
  }

  private _applyDepthStencil(pipeline: WebGl2RenderPipeline): void {
    const { state } = this._host;
    const depthStencil = pipeline.depthStencil;

    state.setEnabled(glc.GL_DEPTH_TEST, depthStencil.depthTest);

    if (depthStencil.depthTest) {
      state.depthFunc(depthStencil.depthFunc);
      state.depthMask(depthStencil.depthWrite);
    }

    state.setEnabled(
      glc.GL_POLYGON_OFFSET_FILL,
      depthStencil.polygonOffset !== null,
    );

    if (depthStencil.polygonOffset) {
      state.polygonOffset(
        depthStencil.polygonOffset[0],
        depthStencil.polygonOffset[1],
      );
    }

    state.setEnabled(glc.GL_STENCIL_TEST, depthStencil.stencilTest);

    if (depthStencil.stencilTest) {
      const reference = this._stencilReference;

      state.stencilFace(glc.GL_FRONT, {
        ...depthStencil.stencilFront,
        reference,
      });
      state.stencilFace(glc.GL_BACK, {
        ...depthStencil.stencilBack,
        reference,
      });
    }
  }

  private _applyBlend(pipeline: WebGl2RenderPipeline): void {
    const { state } = this._host;
    const blends = pipeline.targetBlends;

    if (blends.length === 0) {
      return;
    }

    if (pipeline.hasUniformBlend) {
      state.setBlend(blends[0].factors !== null, blends[0].factors);
      state.colorMask(blends[0].writeMask);
    } else {
      blends.forEach((blend, index) => {
        state.setBlendOf(index, blend.factors !== null, blend.factors);
        state.colorMaskOf(index, blend.writeMask);
      });
    }

    if (pipeline.usesBlendConstant) {
      state.blendColor(this._blendConstant);
    }
  }

  private _applyBindGroup(pipeline: WebGl2RenderPipeline, slot: number): void {
    const { state } = this._host;
    const bindGroup = this._bindGroups[slot];
    const layout = pipeline.bindGroupLayouts[slot];

    if (bindGroup?.layout !== layout) {
      const received = bindGroup
        ? `layout "${bindGroup.layout.label}"`
        : 'no bind group';

      throw new Error(
        `Pipeline "${pipeline.label}" needs a bind group with layout "${layout.label}" in slot ${slot}, received ${received}.`,
      );
    }

    const offsets = this._dynamicOffsets[slot];

    for (const bound of bindGroup.buffers) {
      const dynamicOffset =
        bound.dynamicIndex === -1 ? 0 : offsets[bound.dynamicIndex];

      state.bindUniformBufferRange(
        slot * maxUniformBlocksPerGroup + bound.blockIndex,
        bound.buffer.glBuffer,
        bound.offset + dynamicOffset,
        bound.size,
      );
    }

    const unitBase = pipeline.program.unitBases[slot];

    for (const bound of bindGroup.textures) {
      const unit = unitBase + bound.unitOffset;

      state.bindTexture(unit, bound.texture.glTarget, bound.texture.glTexture);
      state.bindSampler(unit, bound.sampler.glSampler);
    }
  }

  private _resolve(): void {
    const { gl, state } = this._host;

    this._colors.forEach((color, index) => {
      if (!color.resolve) {
        return;
      }

      const target = this._host.getFramebuffer([color.resolve], null);

      state.bindReadFramebuffer(this._framebuffer);
      gl.readBuffer(glc.GL_COLOR_ATTACHMENT0 + index);
      state.bindDrawFramebuffer(target);
      state.setEnabled(glc.GL_SCISSOR_TEST, false);
      state.colorMask(colorWrite.all);
      gl.blitFramebuffer(
        0,
        0,
        this._width,
        this._height,
        0,
        0,
        this._width,
        this._height,
        glc.GL_COLOR_BUFFER_BIT,
        glc.GL_NEAREST,
      );
    });
  }

  private _invalidate(): void {
    const { gl, state } = this._host;
    const attachments: number[] = [];

    this._colors.forEach((color, index) => {
      if (color.storeOp === 'discard' && !color.ref.texture.isCanvas) {
        attachments.push(glc.GL_COLOR_ATTACHMENT0 + index);
      }
    });

    const depth = this._depth;

    if (depth) {
      const hasStencil = depth.ref.texture.formatInfo.hasStencil;
      const discardsDepth = depth.depthStoreOp === 'discard';
      const discardsStencil = hasStencil && depth.stencilStoreOp === 'discard';

      if (discardsDepth && (discardsStencil || !hasStencil)) {
        attachments.push(
          hasStencil
            ? glc.GL_DEPTH_STENCIL_ATTACHMENT
            : glc.GL_DEPTH_ATTACHMENT,
        );
      } else if (discardsDepth) {
        attachments.push(glc.GL_DEPTH_ATTACHMENT);
      } else if (discardsStencil) {
        attachments.push(GL_STENCIL_ATTACHMENT);
      }
    }

    if (attachments.length === 0) {
      return;
    }

    state.bindDrawFramebuffer(this._framebuffer);
    gl.invalidateFramebuffer(glc.GL_DRAW_FRAMEBUFFER, attachments);
  }

  private _assertDynamicOffsets(
    bindGroup: WebGl2BindGroup,
    dynamicOffsets: readonly number[],
  ): void {
    const { uniformBufferOffsetAlignment } = this._host.capabilities.limits;

    if (dynamicOffsets.length !== bindGroup.layout.dynamicOffsetCount) {
      throw new Error(
        `Bind group "${bindGroup.label}" needs ${bindGroup.layout.dynamicOffsetCount} dynamic offsets, received ${dynamicOffsets.length}.`,
      );
    }

    for (const bound of bindGroup.buffers) {
      if (bound.dynamicIndex === -1) {
        continue;
      }

      const offset = dynamicOffsets[bound.dynamicIndex];

      if (
        offset < 0 ||
        offset % uniformBufferOffsetAlignment !== 0 ||
        bound.offset + offset + bound.size > bound.buffer.size
      ) {
        throw new Error(
          `Bind group "${bindGroup.label}"'s dynamic offset ${offset} must be a multiple of ${uniformBufferOffsetAlignment} that keeps its range inside the buffer.`,
        );
      }
    }
  }

  private _assertOpen(): void {
    if (this._hasEnded) {
      throw new Error(`Render pass "${this._label}" has ended.`);
    }
  }
}

function sameOffsets(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
