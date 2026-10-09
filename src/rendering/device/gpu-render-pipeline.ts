import type { GpuBindGroupLayout } from './gpu-bind-group.js';
import type {
  GpuCompareFunction,
  GpuDepthTextureFormat,
  GpuTextureFormat,
} from './gpu-texture.js';

/**
 * A mesh vertex attribute by what it means. Each has a fixed location
 * (see {@link vertexSemanticLocations}) and a fixed name in vertex shaders:
 * `a_` followed by the semantic (`in vec3 a_position;`).
 */
export type GpuVertexSemantic =
  | 'position'
  | 'normal'
  | 'tangent'
  | 'uv0'
  | 'uv1'
  | 'color0'
  | 'joints0'
  | 'weights0'
  | 'joints1'
  | 'weights1';

/**
 * The location of each mesh vertex semantic. Every program has its inputs
 * bound to these before it's linked, so one vertex array layout serves
 * every pipeline that reads the same mesh. Locations 8 to 15 are for
 * per-instance data; `joints1` and `weights1` share 8 and 9 with it, since
 * no pipeline reads both.
 */
export const vertexSemanticLocations: Readonly<
  Record<GpuVertexSemantic, number>
> = {
  position: 0,
  normal: 1,
  tangent: 2,
  uv0: 3,
  uv1: 4,
  color0: 5,
  joints0: 6,
  weights0: 7,
  joints1: 8,
  weights1: 9,
};

/** The first location for per-instance attributes. */
export const firstInstanceAttributeLocation = 8;

/** The last location for per-instance attributes. */
export const lastInstanceAttributeLocation = 15;

/**
 * A vertex attribute's format in its buffer, as WebGPU names it. `float`
 * formats are read as floats; `unorm` and `snorm` formats are converted to
 * floats in `[0, 1]` or `[-1, 1]`; `uint` and `sint` formats are read as
 * integers, so the shader declares the input as a `uvec` or `ivec`.
 */
export type GpuVertexFormat =
  | 'float32'
  | 'float32x2'
  | 'float32x3'
  | 'float32x4'
  | 'float16x2'
  | 'float16x4'
  | 'unorm8x2'
  | 'unorm8x4'
  | 'snorm8x2'
  | 'snorm8x4'
  | 'uint8x2'
  | 'uint8x4'
  | 'sint8x2'
  | 'sint8x4'
  | 'unorm16x2'
  | 'unorm16x4'
  | 'snorm16x2'
  | 'snorm16x4'
  | 'uint16x2'
  | 'uint16x4'
  | 'sint16x2'
  | 'sint16x4'
  | 'uint32'
  | 'uint32x2'
  | 'uint32x3'
  | 'uint32x4'
  | 'sint32'
  | 'sint32x2'
  | 'sint32x3'
  | 'sint32x4'
  | 'unorm10-10-10-2';

/** A mesh attribute, at its semantic's fixed location. */
export interface GpuSemanticVertexAttribute {
  /** What the attribute means. */
  semantic: GpuVertexSemantic;

  /** Its format in the buffer. */
  format: GpuVertexFormat;

  /** Its byte offset within each vertex. */
  offset: number;
}

/**
 * A per-instance attribute, at a location from `8` to `15` with the name
 * the vertex shader declares it with.
 */
export interface GpuInstanceVertexAttribute {
  /** The input's name in the vertex shader (`a_instanceOrigin`). */
  name: string;

  /** Its location, from `8` to `15`. */
  shaderLocation: number;

  /** Its format in the buffer. */
  format: GpuVertexFormat;

  /** Its byte offset within each instance. */
  offset: number;
}

/** A vertex attribute a pipeline reads. */
export type GpuVertexAttribute =
  GpuSemanticVertexAttribute | GpuInstanceVertexAttribute;

/** Whether a vertex buffer advances per vertex or per instance. */
export type GpuVertexStepMode = 'vertex' | 'instance';

/** The layout of one vertex buffer slot. */
export interface GpuVertexBufferLayout {
  /** The bytes from one vertex (or instance) to the next. */
  stride: number;

  /** Whether it advances per vertex or per instance. Defaults to `'vertex'`. */
  stepMode?: GpuVertexStepMode;

  /** The attributes read from it. */
  attributes: readonly GpuVertexAttribute[];
}

/** The primitives a draw's vertices form. */
export type GpuPrimitiveTopology =
  | 'point-list'
  | 'line-list'
  | 'line-strip'
  | 'triangle-list'
  | 'triangle-strip';

/** How primitives are assembled and culled. */
export interface GpuPrimitiveState {
  /** The primitives drawn. Defaults to `'triangle-list'`. */
  topology?: GpuPrimitiveTopology;

  /** Which faces are culled. Defaults to `'none'`. */
  cullMode?: 'none' | 'front' | 'back';

  /**
   * Which winding is the front face. Defaults to `'ccw'`. A mirrored
   * object (negative scale determinant) uses a pipeline with the other one.
   */
  frontFace?: 'ccw' | 'cw';
}

/** What a stencil test does to the stencil value. */
export type GpuStencilOperation =
  | 'keep'
  | 'zero'
  | 'replace'
  | 'invert'
  | 'increment-clamp'
  | 'decrement-clamp'
  | 'increment-wrap'
  | 'decrement-wrap';

/** The stencil test of one face. */
export interface GpuStencilFaceState {
  /** The test against the reference. Defaults to `'always'`. */
  compare?: GpuCompareFunction;

  /** What a failed stencil test does. Defaults to `'keep'`. */
  failOp?: GpuStencilOperation;

  /** What a failed depth test does. Defaults to `'keep'`. */
  depthFailOp?: GpuStencilOperation;

  /** What passing both tests does. Defaults to `'keep'`. */
  passOp?: GpuStencilOperation;
}

/** Depth and stencil testing, for a pass with a depth attachment. */
export interface GpuDepthStencilState {
  /** The depth attachment's format. */
  format: GpuDepthTextureFormat;

  /** Whether passing fragments write their depth. Defaults to `false`. */
  depthWrite?: boolean;

  /** The depth test. Defaults to `'always'`. */
  depthCompare?: GpuCompareFunction;

  /** The stencil test of front faces. */
  stencilFront?: GpuStencilFaceState;

  /** The stencil test of back faces. */
  stencilBack?: GpuStencilFaceState;

  /** The stencil bits read. Defaults to `0xff`. */
  stencilReadMask?: number;

  /** The stencil bits written. Defaults to `0xff`. */
  stencilWriteMask?: number;

  /** A constant depth offset, in the smallest resolvable steps. Defaults to `0`. */
  depthBias?: number;

  /** A depth offset scaled by the polygon's depth slope. Defaults to `0`. */
  depthBiasSlopeScale?: number;
}

/** A factor a blend multiplies the source or destination by. */
export type GpuBlendFactor =
  | 'zero'
  | 'one'
  | 'src'
  | 'one-minus-src'
  | 'src-alpha'
  | 'one-minus-src-alpha'
  | 'dst'
  | 'one-minus-dst'
  | 'dst-alpha'
  | 'one-minus-dst-alpha'
  | 'src-alpha-saturated'
  | 'constant'
  | 'one-minus-constant';

/** How a blend combines the weighted source and destination. */
export type GpuBlendOperation =
  'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';

/** The blend of the color or the alpha channel. */
export interface GpuBlendComponent {
  /** How the two are combined. */
  operation: GpuBlendOperation;

  /** The source's factor. */
  srcFactor: GpuBlendFactor;

  /** The destination's factor. */
  dstFactor: GpuBlendFactor;
}

/** How a color target blends a fragment into what it holds. */
export interface GpuBlendState {
  /** The blend of the color channels. */
  color: GpuBlendComponent;

  /** The blend of the alpha channel. */
  alpha: GpuBlendComponent;
}

/**
 * The blend states the engine draws with. Every render destination holds
 * premultiplied alpha, so a shader that outputs straight alpha draws with
 * `straightAlphaOver` and one that outputs premultiplied color (a render
 * target's texture) with `premultipliedOver`.
 */
export const blendStates = {
  /** Writes the fragment as it is: no blending. */
  replace: {
    color: { operation: 'add', srcFactor: 'one', dstFactor: 'zero' },
    alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'zero' },
  },
  /**
   * Draws a straight-alpha fragment over the destination, storing
   * premultiplied color and alpha.
   */
  straightAlphaOver: {
    color: {
      operation: 'add',
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
    },
    alpha: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  /** Draws a premultiplied fragment over the destination. */
  premultipliedOver: {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
    alpha: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  /**
   * Adds a premultiplied fragment's color to the destination and leaves
   * its alpha unchanged, for light that only brightens what's beneath it.
   */
  additive: {
    color: { operation: 'add', srcFactor: 'one', dstFactor: 'one' },
    alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' },
  },
  /**
   * Multiplies the destination by a premultiplied fragment's color, where
   * the fragment covers it.
   */
  multiply: {
    color: {
      operation: 'add',
      srcFactor: 'dst',
      dstFactor: 'one-minus-src-alpha',
    },
    alpha: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
  },
} as const satisfies Readonly<Record<string, GpuBlendState>>;

/**
 * The channels a color target writes, as flags to combine with `|`:
 * `colorWrite.red | colorWrite.alpha`.
 */
export const colorWrite = {
  red: 0x1,
  green: 0x2,
  blue: 0x4,
  alpha: 0x8,
  all: 0xf,
} as const;

/** One color target of a pipeline. */
export interface GpuColorTargetState {
  /** The format of the pass's color attachment at this index. */
  format: GpuTextureFormat;

  /** How fragments blend into it. Defaults to `blendStates.replace`. */
  blend?: GpuBlendState;

  /** The channels written, from {@link colorWrite}. Defaults to `colorWrite.all`. */
  writeMask?: number;
}

/** Multisampling. */
export interface GpuMultisampleState {
  /**
   * The pass's sample count, clamped to the device's for the target
   * formats. Defaults to `1`.
   */
  count?: number;

  /**
   * Whether the first target's alpha decides which samples a fragment
   * covers, for alpha-tested foliage under MSAA. Needs a first target whose
   * format has alpha. Defaults to `false`.
   */
  alphaToCoverage?: boolean;
}

/**
 * The GLSL ES 3.00 shaders of a pipeline. Each starts with
 * `#version 300 es` (added if missing); the device inserts `defines` and
 * its own prelude after it. In the vertex shader, `FORGE_DRAW_ID` is the
 * index of the draw within a multi-draw call (`0` without one).
 */
export interface GpuShaderSources {
  /** The vertex shader's source. */
  vertex: string;

  /** The fragment shader's source. */
  fragment: string;

  /**
   * Preprocessor definitions added to both shaders: `true` is defined as
   * `1` and `false` as `0`.
   */
  defines?: Readonly<Record<string, string | number | boolean>>;
}

/** Describes a render pipeline for `GpuDevice.createRenderPipeline`. */
export interface GpuRenderPipelineDescriptor {
  /** The shaders. */
  shaders: GpuShaderSources;

  /** The vertex buffer slots and the attributes read from them. */
  vertexBuffers?: readonly GpuVertexBufferLayout[];

  /** How primitives are assembled and culled. */
  primitive?: GpuPrimitiveState;

  /** Depth and stencil testing, for a pass with a depth attachment. */
  depthStencil?: GpuDepthStencilState;

  /** The color targets, one per color attachment of the pass. */
  targets: readonly GpuColorTargetState[];

  /** Multisampling. */
  multisample?: GpuMultisampleState;

  /**
   * The layout of each bind group slot the shaders read, by slot (see
   * `bindGroupSlots`). At most four.
   */
  bindGroupLayouts: readonly GpuBindGroupLayout[];

  /** A name for the pipeline, used in error messages. */
  label?: string;
}

/**
 * A complete GPU pipeline state: linked shaders, vertex layout and
 * fixed-function state, created by `GpuDevice.createRenderPipeline`. The
 * device deduplicates pipelines (equal descriptors return the same
 * pipeline) and shares one linked program between pipelines with the same
 * shaders, defines, instance attributes and layouts. Pipelines live as long
 * as the device.
 */
export interface GpuRenderPipeline {
  /** The pipeline's label, or `''`. */
  readonly label: string;

  /** The layout of each bind group slot. */
  readonly bindGroupLayouts: readonly GpuBindGroupLayout[];
}
