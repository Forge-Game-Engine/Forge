/* eslint-disable @typescript-eslint/naming-convention -- lookup tables keyed by WebGPU's kebab-case names and bit counts */
import type {
  GpuBlendComponent,
  GpuBlendFactor,
  GpuBlendOperation,
  GpuBlendState,
  GpuColorTargetState,
  GpuPrimitiveTopology,
  GpuRenderPipeline,
  GpuRenderPipelineDescriptor,
  GpuStencilFaceState,
  GpuStencilOperation,
  GpuVertexAttribute,
  GpuVertexStepMode,
} from '../gpu-render-pipeline.js';
import {
  blendStates,
  colorWrite,
  firstInstanceAttributeLocation,
  lastInstanceAttributeLocation,
  vertexSemanticLocations,
} from '../gpu-render-pipeline.js';
import type { GpuTextureFormat } from '../gpu-texture.js';
import type { DeviceContext } from './device-context.js';
import * as glc from './gl-constants.js';
import type { BlendFactors, StencilFaceState } from './gl-state-cache.js';
import { getTextureFormatInfo, isFormatRenderable } from './texture-formats.js';
import { getVertexFormatInfo, VertexFormatInfo } from './vertex-formats.js';
import type { AttributeBindings, WebGl2Program } from './webgl2-program.js';
import { WebGl2BindGroupLayout } from './webgl2-bind-group.js';
import { assertSampleCountSupported } from './sample-counts.js';
import { compareFunctions } from './webgl2-sampler.js';

/** The most bind group slots a pipeline has. */
export const maxBindGroups = 4;

const blendFactors: Record<GpuBlendFactor, number> = {
  zero: glc.GL_ZERO,
  one: glc.GL_ONE,
  src: glc.GL_SRC_COLOR,
  'one-minus-src': glc.GL_ONE_MINUS_SRC_COLOR,
  'src-alpha': glc.GL_SRC_ALPHA,
  'one-minus-src-alpha': glc.GL_ONE_MINUS_SRC_ALPHA,
  dst: glc.GL_DST_COLOR,
  'one-minus-dst': glc.GL_ONE_MINUS_DST_COLOR,
  'dst-alpha': glc.GL_DST_ALPHA,
  'one-minus-dst-alpha': glc.GL_ONE_MINUS_DST_ALPHA,
  'src-alpha-saturated': glc.GL_SRC_ALPHA_SATURATE,
  constant: glc.GL_CONSTANT_COLOR,
  'one-minus-constant': glc.GL_ONE_MINUS_CONSTANT_COLOR,
};

const blendOperations: Record<GpuBlendOperation, number> = {
  add: glc.GL_FUNC_ADD,
  subtract: glc.GL_FUNC_SUBTRACT,
  'reverse-subtract': glc.GL_FUNC_REVERSE_SUBTRACT,
  min: glc.GL_MIN,
  max: glc.GL_MAX,
};

const stencilOperations: Record<GpuStencilOperation, number> = {
  keep: glc.GL_KEEP,
  zero: glc.GL_ZERO,
  replace: glc.GL_REPLACE,
  invert: glc.GL_INVERT,
  'increment-clamp': glc.GL_INCR,
  'decrement-clamp': glc.GL_DECR,
  'increment-wrap': glc.GL_INCR_WRAP,
  'decrement-wrap': glc.GL_DECR_WRAP,
};

const topologies: Record<GpuPrimitiveTopology, number> = {
  'point-list': glc.GL_POINTS,
  'line-list': glc.GL_LINES,
  'line-strip': glc.GL_LINE_STRIP,
  'triangle-list': glc.GL_TRIANGLES,
  'triangle-strip': glc.GL_TRIANGLE_STRIP,
};

const cullFaces: Record<'none' | 'front' | 'back', number | null> = {
  none: null,
  front: glc.GL_FRONT,
  back: glc.GL_BACK,
};

/** One attribute of a vertex buffer slot, resolved for `vertexAttribPointer`. */
export interface ResolvedVertexAttribute extends VertexFormatInfo {
  readonly location: number;
  readonly offset: number;
}

/** One vertex buffer slot, resolved. */
export interface ResolvedVertexBuffer {
  readonly stride: number;
  readonly stepMode: GpuVertexStepMode;
  readonly attributes: readonly ResolvedVertexAttribute[];
}

/** A color target's blending, as GL values; `null` factors for no blend. */
export interface ResolvedTargetBlend {
  readonly factors: BlendFactors | null;
  readonly writeMask: number;
}

/** A pipeline's depth and stencil state, as GL values. */
export interface ResolvedDepthStencil {
  readonly depthTest: boolean;
  readonly depthWrite: boolean;
  readonly depthFunc: number;
  readonly polygonOffset: readonly [factor: number, units: number] | null;
  readonly stencilTest: boolean;
  readonly stencilFront: StencilFaceState;
  readonly stencilBack: StencilFaceState;
}

function toBlendFactors(blend: GpuBlendState): BlendFactors | null {
  if (isReplace(blend)) {
    return null;
  }

  return {
    srcRgb: blendFactors[blend.color.srcFactor],
    dstRgb: blendFactors[blend.color.dstFactor],
    srcAlpha: blendFactors[blend.alpha.srcFactor],
    dstAlpha: blendFactors[blend.alpha.dstFactor],
    modeRgb: blendOperations[blend.color.operation],
    modeAlpha: blendOperations[blend.alpha.operation],
  };
}

function isReplaceComponent(component: GpuBlendComponent): boolean {
  return (
    component.operation === 'add' &&
    component.srcFactor === 'one' &&
    component.dstFactor === 'zero'
  );
}

function isReplace(blend: GpuBlendState): boolean {
  return isReplaceComponent(blend.color) && isReplaceComponent(blend.alpha);
}

function sameBlend(a: ResolvedTargetBlend, b: ResolvedTargetBlend): boolean {
  if (a.writeMask !== b.writeMask) {
    return false;
  }

  if (a.factors === null || b.factors === null) {
    return a.factors === b.factors;
  }

  return (Object.keys(a.factors) as (keyof BlendFactors)[]).every(
    (key) => a.factors?.[key] === b.factors?.[key],
  );
}

function resolveStencilFace(
  face: GpuStencilFaceState | undefined,
  readMask: number,
  writeMask: number,
): StencilFaceState {
  return {
    func: compareFunctions[face?.compare ?? 'always'],
    reference: 0,
    readMask,
    writeMask,
    fail: stencilOperations[face?.failOp ?? 'keep'],
    depthFail: stencilOperations[face?.depthFailOp ?? 'keep'],
    pass: stencilOperations[face?.passOp ?? 'keep'],
  };
}

function isDefaultStencilFace(face: GpuStencilFaceState | undefined): boolean {
  return (
    (face?.compare ?? 'always') === 'always' &&
    (face?.failOp ?? 'keep') === 'keep' &&
    (face?.depthFailOp ?? 'keep') === 'keep' &&
    (face?.passOp ?? 'keep') === 'keep'
  );
}

/**
 * The key a pass and a pipeline must share to be drawn together: the color
 * formats, the depth format and the sample count.
 * @param colorFormats - The color formats, in attachment order.
 * @param depthFormat - The depth format, or `null`.
 * @param sampleCount - The sample count.
 * @returns The key.
 */
export function getAttachmentSignature(
  colorFormats: readonly GpuTextureFormat[],
  depthFormat: GpuTextureFormat | null,
  sampleCount: number,
): string {
  return `${colorFormats.join(',')}|${depthFormat ?? ''}|${sampleCount}`;
}

/**
 * The attribute names and locations a pipeline's program is linked with:
 * every mesh semantic's, then the per-instance attributes'.
 * @param descriptor - The pipeline descriptor.
 * @returns The bindings.
 */
export function getAttributeBindings(
  descriptor: GpuRenderPipelineDescriptor,
): AttributeBindings {
  const bindings: [string, number][] = Object.entries(
    vertexSemanticLocations,
  ).map(([semantic, location]) => [`a_${semantic}`, location]);

  for (const buffer of descriptor.vertexBuffers ?? []) {
    for (const attribute of buffer.attributes) {
      if (!('semantic' in attribute)) {
        bindings.push([attribute.name, attribute.shaderLocation]);
      }
    }
  }

  return bindings;
}

/** A render pipeline: its program and fixed-function state as GL values. */
export class WebGl2RenderPipeline implements GpuRenderPipeline {
  public readonly label: string;
  public readonly bindGroupLayouts: readonly WebGl2BindGroupLayout[];

  /** Unique among the device's resources, for cache keys. */
  public readonly id: number;

  /** The key of the vertex layout, shared by equal layouts. */
  public readonly vertexLayoutKey: string;

  /** The vertex buffer slots. */
  public readonly vertexBuffers: readonly ResolvedVertexBuffer[];

  /** The primitive drawn. */
  public readonly topology: number;

  /** The culled face, or `null` for none. */
  public readonly cullFace: number | null;

  /** The front face winding. */
  public readonly frontFace: number;

  /** Depth and stencil state. */
  public readonly depthStencil: ResolvedDepthStencil;

  /** Each color target's blending and write mask. */
  public readonly targetBlends: readonly ResolvedTargetBlend[];

  /** Whether every target blends alike, so one global call sets them all. */
  public readonly hasUniformBlend: boolean;

  /** Whether alpha-to-coverage is on. */
  public readonly alphaToCoverage: boolean;

  /** Whether a pipeline uses the blend constant. */
  public readonly usesBlendConstant: boolean;

  /** The attachment signature a pass must have to draw with it. */
  public readonly attachmentSignature: string;

  /** The linked program's key: shaders, defines, attributes and layouts. */
  public readonly programKey: string;

  /** The attribute names and locations its program is linked with. */
  public readonly attributeBindings: AttributeBindings;

  /** The linked program, shared with equal pipelines. */
  public readonly program: WebGl2Program;

  /**
   * Checks the descriptor against the device and resolves it to GL values.
   * Its program is linked by the device.
   * @param context - The device's shared context.
   * @param descriptor - The descriptor.
   * @param id - The pipeline's id.
   * @param getProgram - Returns the program for a key, linking it the
   * first time.
   * @throws An error if the state doesn't fit the device, or the program
   * fails to link.
   */
  constructor(
    context: DeviceContext,
    descriptor: GpuRenderPipelineDescriptor,
    id: number,
    getProgram: (pipeline: WebGl2RenderPipeline) => WebGl2Program,
  ) {
    this.label = descriptor.label ?? '';
    this.id = id;
    this.bindGroupLayouts = this._resolveLayouts(context, descriptor);
    this.vertexBuffers = this._resolveVertexBuffers(context, descriptor);
    this.vertexLayoutKey = JSON.stringify(this.vertexBuffers);

    const primitive = descriptor.primitive ?? {};
    const cullMode = primitive.cullMode ?? 'none';

    this.topology = topologies[primitive.topology ?? 'triangle-list'];
    this.cullFace = cullFaces[cullMode];
    this.frontFace =
      (primitive.frontFace ?? 'ccw') === 'ccw' ? glc.GL_CCW : glc.GL_CW;
    this.depthStencil = this._resolveDepthStencil(descriptor);
    this.targetBlends = this._resolveTargets(context, descriptor.targets);
    this.hasUniformBlend = this.targetBlends.every((blend) =>
      sameBlend(blend, this.targetBlends[0]),
    );

    if (!this.hasUniformBlend && !context.capabilities.independentBlend) {
      throw new Error(
        `Pipeline "${this.label}" blends or masks its targets differently, which needs the OES_draw_buffers_indexed extension.`,
      );
    }

    this.usesBlendConstant = descriptor.targets.some((target) =>
      [target.blend?.color, target.blend?.alpha].some(
        (component) =>
          component?.srcFactor.includes('constant') === true ||
          component?.dstFactor.includes('constant') === true,
      ),
    );
    this.alphaToCoverage = this._resolveAlphaToCoverage(descriptor);
    this.attachmentSignature = getAttachmentSignature(
      descriptor.targets.map((target) => target.format),
      descriptor.depthStencil?.format ?? null,
      this._resolveSampleCount(context, descriptor),
    );
    this.attributeBindings = getAttributeBindings(descriptor);
    this.programKey = JSON.stringify([
      descriptor.shaders.vertex,
      descriptor.shaders.fragment,
      Object.entries(descriptor.shaders.defines ?? {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      this.attributeBindings,
      this.bindGroupLayouts.map((layout) => layout.id),
    ]);
    this.program = getProgram(this);
  }

  private _resolveLayouts(
    context: DeviceContext,
    descriptor: GpuRenderPipelineDescriptor,
  ): WebGl2BindGroupLayout[] {
    const { limits } = context.capabilities;
    const layouts = descriptor.bindGroupLayouts.map((layout) => {
      if (!(layout instanceof WebGl2BindGroupLayout)) {
        throw new Error(
          `Pipeline "${this.label}" needs bind group layouts made by the same device.`,
        );
      }

      return layout;
    });

    if (layouts.length > maxBindGroups) {
      throw new Error(
        `Pipeline "${this.label}" has ${layouts.length} bind group layouts; at most ${maxBindGroups}.`,
      );
    }

    const textures = layouts.flatMap((layout) => layout.textures);
    const fragmentCount = textures.filter(
      (texture) => texture.isFragmentVisible,
    ).length;
    const vertexCount = textures.filter(
      (texture) => texture.isVertexVisible,
    ).length;

    if (
      fragmentCount > limits.maxTextureImageUnits ||
      vertexCount > limits.maxVertexTextureImageUnits ||
      textures.length > limits.maxCombinedTextureImageUnits
    ) {
      throw new Error(
        `Pipeline "${this.label}" samples ${fragmentCount} textures in the fragment stage and ${vertexCount} in the vertex stage (${textures.length} in all); this device allows ${limits.maxTextureImageUnits}, ${limits.maxVertexTextureImageUnits} and ${limits.maxCombinedTextureImageUnits}.`,
      );
    }

    return layouts;
  }

  private _resolveVertexBuffers(
    context: DeviceContext,
    descriptor: GpuRenderPipelineDescriptor,
  ): ResolvedVertexBuffer[] {
    const usedLocations = new Set<number>();
    const { maxVertexAttributes } = context.capabilities.limits;

    return (descriptor.vertexBuffers ?? []).map((buffer) => ({
      stride: buffer.stride,
      stepMode: buffer.stepMode ?? 'vertex',
      attributes: buffer.attributes.map((attribute) => {
        const location = this._attributeLocation(attribute);
        const format = getVertexFormatInfo(attribute.format);

        if (usedLocations.has(location) || location >= maxVertexAttributes) {
          throw new Error(
            `Pipeline "${this.label}" reads location ${location} twice, or past the device's ${maxVertexAttributes} attributes.`,
          );
        }

        if (
          attribute.offset < 0 ||
          attribute.offset + format.byteSize > buffer.stride
        ) {
          throw new Error(
            `Pipeline "${this.label}"'s attribute at location ${location} doesn't fit in its ${buffer.stride}-byte stride.`,
          );
        }

        usedLocations.add(location);

        return { ...format, location, offset: attribute.offset };
      }),
    }));
  }

  private _attributeLocation(attribute: GpuVertexAttribute): number {
    if ('semantic' in attribute) {
      return vertexSemanticLocations[attribute.semantic];
    }

    if (
      !Number.isInteger(attribute.shaderLocation) ||
      attribute.shaderLocation < firstInstanceAttributeLocation ||
      attribute.shaderLocation > lastInstanceAttributeLocation
    ) {
      throw new Error(
        `Pipeline "${this.label}"'s attribute "${attribute.name}" is at location ${attribute.shaderLocation}; named attributes use locations ${firstInstanceAttributeLocation} to ${lastInstanceAttributeLocation}.`,
      );
    }

    return attribute.shaderLocation;
  }

  private _resolveDepthStencil(
    descriptor: GpuRenderPipelineDescriptor,
  ): ResolvedDepthStencil {
    const state = descriptor.depthStencil;
    const depthWrite = state?.depthWrite ?? false;
    const depthCompare = state?.depthCompare ?? 'always';
    const bias = state?.depthBias ?? 0;
    const slope = state?.depthBiasSlopeScale ?? 0;
    const readMask = state?.stencilReadMask ?? 0xff;
    const writeMask = state?.stencilWriteMask ?? 0xff;

    if (state && !getTextureFormatInfo(state.format).hasDepth) {
      throw new Error(
        `Pipeline "${this.label}"'s depth-stencil format "${state.format}" isn't a depth format.`,
      );
    }

    const usesStencil =
      state !== undefined &&
      getTextureFormatInfo(state.format).hasStencil &&
      !(
        isDefaultStencilFace(state.stencilFront) &&
        isDefaultStencilFace(state.stencilBack)
      );

    return {
      depthTest:
        state !== undefined && (depthWrite || depthCompare !== 'always'),
      depthWrite,
      depthFunc: compareFunctions[depthCompare],
      polygonOffset: bias !== 0 || slope !== 0 ? [slope, bias] : null,
      stencilTest: usesStencil,
      stencilFront: resolveStencilFace(
        state?.stencilFront,
        readMask,
        writeMask,
      ),
      stencilBack: resolveStencilFace(state?.stencilBack, readMask, writeMask),
    };
  }

  private _resolveTargets(
    context: DeviceContext,
    targets: readonly GpuColorTargetState[],
  ): ResolvedTargetBlend[] {
    const { capabilities } = context;

    if (targets.length > capabilities.limits.maxColorAttachments) {
      throw new Error(
        `Pipeline "${this.label}" has ${targets.length} targets; this device allows ${capabilities.limits.maxColorAttachments}.`,
      );
    }

    return targets.map((target) => {
      const info = getTextureFormatInfo(target.format);
      const blend = target.blend ?? blendStates.replace;

      if (info.hasDepth || !isFormatRenderable(info, capabilities)) {
        throw new Error(
          `Pipeline "${this.label}" can't render to "${target.format}" on this device.`,
        );
      }

      const blends = !isReplace(blend);

      const cannotBlend =
        info.sampleClass === 'uint' ||
        (info.sampleClass === 'float32' && !capabilities.floatBlend);

      if (blends && cannotBlend) {
        throw new Error(
          `Pipeline "${this.label}" blends into "${target.format}", which this device can't blend.`,
        );
      }

      return {
        factors: toBlendFactors(blend),
        writeMask: target.writeMask ?? colorWrite.all,
      };
    });
  }

  private _resolveAlphaToCoverage(
    descriptor: GpuRenderPipelineDescriptor,
  ): boolean {
    const alphaToCoverage = descriptor.multisample?.alphaToCoverage ?? false;
    const first = descriptor.targets[0];

    if (
      alphaToCoverage &&
      (!first || !getTextureFormatInfo(first.format).hasAlpha)
    ) {
      throw new Error(
        `Pipeline "${this.label}" uses alpha-to-coverage, which needs a first target whose format has alpha.`,
      );
    }

    return alphaToCoverage;
  }

  private _resolveSampleCount(
    context: DeviceContext,
    descriptor: GpuRenderPipelineDescriptor,
  ): number {
    const requested = descriptor.multisample?.count ?? 1;

    if (requested <= 1) {
      return 1;
    }

    const formats: GpuTextureFormat[] = descriptor.targets.map(
      (target) => target.format,
    );

    if (descriptor.depthStencil) {
      formats.push(descriptor.depthStencil.format);
    }

    for (const format of formats) {
      assertSampleCountSupported(
        context.capabilities,
        format,
        requested,
        `Pipeline "${this.label}"`,
      );
    }

    return requested;
  }
}
